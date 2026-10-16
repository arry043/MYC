-- Migration: profiles_and_commitments
-- Implements Task 05 (Profiles & Onboarding), Task 06 (First Commitment & "I COMMIT"), and Task 07 (Commitment Management).

-- 1. Profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  myc_started_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_check check (char_length(timezone) between 1 and 64)
);

comment on table public.profiles is 'User profile holding authoritative timezone and official MYC journey start date.';
comment on column public.profiles.myc_started_at is 'Official start date of the MYC journey, set only when confirming first commitment through "I COMMIT".';

-- Profiles RLS policies (RLS auto-enabled via ensure_rls trigger)
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id and myc_started_at is null);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to protect profile fields (immutability of user_id, created_at, myc_started_at)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'user_id cannot be changed';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at cannot be changed';
  end if;

  if old.myc_started_at is not null and new.myc_started_at is distinct from old.myc_started_at then
    raise exception 'myc_started_at is immutable once established';
  end if;

  if old.myc_started_at is null and new.myc_started_at is not null then
    if current_setting('myc.internal_confirmation', true) is distinct from 'true' then
      raise exception 'myc_started_at can only be set via confirm_first_commitment ("I COMMIT")';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_protect_profile_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_fields();

-- Profile auto-initialization trigger on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, timezone, myc_started_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'timezone'), ''), 'UTC'),
    null
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile idempotent retrieval / creation function
create or replace function public.ensure_profile(detected_timezone text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_tz text := 'UTC';
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if detected_timezone is not null and char_length(trim(detected_timezone)) between 1 and 64 then
    v_tz := trim(detected_timezone);
  end if;

  insert into public.profiles (user_id, timezone, myc_started_at)
  values (v_user_id, v_tz, null)
  on conflict (user_id) do nothing;

  select * into v_profile from public.profiles where user_id = v_user_id;
  return v_profile;
end;
$$;

grant execute on function public.ensure_profile(text) to authenticated;

-- 2. Commitments table
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  frequency text not null default 'daily' check (frequency in ('daily', 'specific_days')),
  schedule_days smallint[] check (
    (frequency = 'daily' and (schedule_days is null or schedule_days = array[1,2,3,4,5,6,7]::smallint[]))
    or
    (frequency = 'specific_days' and schedule_days is not null and cardinality(schedule_days) > 0 and schedule_days <@ array[1,2,3,4,5,6,7]::smallint[])
  ),
  start_date date not null default current_date,
  end_date date check (end_date is null or end_date >= start_date),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  tone text not null default 'sky' check (tone in ('sky', 'lavender', 'peach', 'mint', 'sun')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.commitments is 'User consistency commitments with schedule and status.';

-- Commitments RLS policies (RLS auto-enabled via ensure_rls trigger)
create policy "commitments_select_own"
  on public.commitments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "commitments_insert_own"
  on public.commitments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "commitments_update_own"
  on public.commitments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "commitments_delete_own"
  on public.commitments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger to validate commitment rules and activation gatekeeper
create or replace function public.check_commitment_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_myc_started_at date;
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'Commitment owner cannot be modified';
  end if;

  new.updated_at = now();

  if new.frequency = 'daily' and (new.schedule_days is null or cardinality(new.schedule_days) = 0) then
    new.schedule_days := array[1,2,3,4,5,6,7]::smallint[];
  end if;

  -- Ensure first commitment can only be activated through confirm_first_commitment
  select myc_started_at into v_myc_started_at
  from public.profiles
  where user_id = new.user_id;

  if v_myc_started_at is null and new.status = 'active' then
    if current_setting('myc.internal_confirmation', true) is distinct from 'true' then
      raise exception 'The first commitment must be officially activated through "I COMMIT"';
    end if;
  end if;

  return new;
end;
$$;

create trigger tr_check_commitment_rules
  before insert or update on public.commitments
  for each row
  execute function public.check_commitment_rules();

-- 3. Atomic "I COMMIT" RPC function
create or replace function public.confirm_first_commitment(
  commitment_id uuid,
  client_local_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.commitments;
  v_profile public.profiles;
  v_journey_date date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Authorize internal confirmation for this transaction
  perform set_config('myc.internal_confirmation', 'true', true);

  -- Lock profile row
  select * into v_profile
  from public.profiles
  where user_id = v_user_id
  for update;

  if v_profile.id is null then
    insert into public.profiles (user_id, timezone, myc_started_at)
    values (v_user_id, 'UTC', null)
    returning * into v_profile;
  end if;

  -- Lock commitment row and verify ownership
  select * into v_commitment
  from public.commitments
  where id = commitment_id and user_id = v_user_id
  for update;

  if v_commitment.id is null then
    raise exception 'Commitment not found';
  end if;

  -- Determine local calendar date
  v_journey_date := coalesce(
    client_local_date,
    (timezone(v_profile.timezone, now()))::date
  );

  -- Set myc_started_at if not set yet (immutable once set)
  if v_profile.myc_started_at is null then
    update public.profiles
    set myc_started_at = v_journey_date,
        updated_at = now()
    where id = v_profile.id
    returning * into v_profile;
  end if;

  -- Activate commitment if draft
  if v_commitment.status = 'draft' then
    update public.commitments
    set status = 'active',
        start_date = coalesce(v_commitment.start_date, v_journey_date),
        updated_at = now()
    where id = v_commitment.id
    returning * into v_commitment;
  end if;

  return jsonb_build_object(
    'commitment', to_jsonb(v_commitment),
    'profile', to_jsonb(v_profile),
    'myc_started_at', v_profile.myc_started_at
  );
end;
$$;

grant execute on function public.confirm_first_commitment(uuid, date) to authenticated;

