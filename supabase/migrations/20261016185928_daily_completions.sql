-- Migration: daily_completions
-- Implements Task 08 (Daily Completion System) and database foundations for Task 09 (Consistency Engine).

-- 1. Daily completions table
create table public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  date date not null,
  status text not null default 'completed' check (status in ('completed')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint daily_completions_unique_user_commitment_date unique (user_id, commitment_id, date)
);

comment on table public.daily_completions is 'Records of completed commitments for specific user calendar dates.';

-- Indexes for efficient queries
create index idx_daily_completions_user_date on public.daily_completions (user_id, date);
create index idx_daily_completions_commitment_date on public.daily_completions (commitment_id, date);

-- 2. RLS policies (RLS auto-enabled via ensure_rls trigger)
create policy "daily_completions_select_own"
  on public.daily_completions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_completions_insert_own"
  on public.daily_completions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "daily_completions_delete_own"
  on public.daily_completions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3. Business rules & integrity trigger
create or replace function public.check_daily_completion_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_commitment record;
  v_profile record;
  v_today date;
  v_dow smallint;
begin
  -- Prevent modifying primary identities once created
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.commitment_id <> old.commitment_id or new.date <> old.date then
      raise exception 'Completion records are immutable; remove and re-create if needed';
    end if;
    return new;
  end if;

  -- Verify user ownership and commitment eligibility
  select id, user_id, status, start_date, end_date, frequency, schedule_days
  into v_commitment
  from public.commitments
  where id = new.commitment_id;

  if v_commitment.id is null then
    raise exception 'Commitment not found';
  end if;

  if v_commitment.user_id <> new.user_id then
    raise exception 'Unauthorized: commitment belongs to another user';
  end if;

  -- Verify profile and timezone
  select timezone, myc_started_at
  into v_profile
  from public.profiles
  where user_id = new.user_id;

  if v_profile.timezone is null then
    raise exception 'User profile not found';
  end if;

  if v_profile.myc_started_at is null then
    raise exception 'Cannot complete commitments: MYC journey has not started yet';
  end if;

  if new.date < v_profile.myc_started_at then
    raise exception 'Cannot complete commitments for dates prior to journey start date (%)', v_profile.myc_started_at;
  end if;

  -- Future-date protection using user's timezone
  v_today := (timezone(v_profile.timezone, now()))::date;
  if new.date > v_today then
    raise exception 'Cannot complete commitments for future dates';
  end if;

  -- Check commitment status and dates
  if v_commitment.status <> 'active' then
    raise exception 'Cannot complete commitment with status: %', v_commitment.status;
  end if;

  if new.date < v_commitment.start_date then
    raise exception 'Cannot complete commitment before its start date (%)', v_commitment.start_date;
  end if;

  if v_commitment.end_date is not null and new.date > v_commitment.end_date then
    raise exception 'Cannot complete commitment after its end date (%)', v_commitment.end_date;
  end if;

  -- Check weekday scheduling
  v_dow := extract(isodow from new.date)::smallint;
  if v_commitment.frequency = 'specific_days' then
    if v_commitment.schedule_days is null or not (v_dow = any(v_commitment.schedule_days)) then
      raise exception 'Commitment is not scheduled for day of week %', v_dow;
    end if;
  end if;

  return new;
end;
$$;

create trigger tr_check_daily_completion_rules
  before insert or update on public.daily_completions
  for each row
  execute function public.check_daily_completion_rules();

-- 4. Idempotent complete_commitment RPC
create or replace function public.complete_commitment(
  p_commitment_id uuid,
  p_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_target_date date;
  v_completion record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select timezone, myc_started_at into v_profile
  from public.profiles
  where user_id = v_user_id;

  if v_profile.timezone is null then
    raise exception 'User profile not found';
  end if;

  v_target_date := coalesce(p_date, (timezone(v_profile.timezone, now()))::date);

  -- Insert with idempotency on conflict
  insert into public.daily_completions (user_id, commitment_id, date, status, completed_at)
  values (v_user_id, p_commitment_id, v_target_date, 'completed', now())
  on conflict (user_id, commitment_id, date) do nothing
  returning * into v_completion;

  -- If already completed, return existing row
  if v_completion.id is null then
    select * into v_completion
    from public.daily_completions
    where user_id = v_user_id
      and commitment_id = p_commitment_id
      and date = v_target_date;
  end if;

  return to_jsonb(v_completion);
end;
$$;

grant execute on function public.complete_commitment(uuid, date) to authenticated;

-- 5. Idempotent uncomplete_commitment RPC
create or replace function public.uncomplete_commitment(
  p_commitment_id uuid,
  p_date date default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile record;
  v_target_date date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select timezone into v_profile
  from public.profiles
  where user_id = v_user_id;

  if v_profile.timezone is null then
    raise exception 'User profile not found';
  end if;

  v_target_date := coalesce(p_date, (timezone(v_profile.timezone, now()))::date);

  delete from public.daily_completions
  where user_id = v_user_id
    and commitment_id = p_commitment_id
    and date = v_target_date;

  return true;
end;
$$;

grant execute on function public.uncomplete_commitment(uuid, date) to authenticated;

