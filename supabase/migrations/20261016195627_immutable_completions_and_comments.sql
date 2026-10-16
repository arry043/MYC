-- Migration: immutable_completions_and_comments
-- Enforces permanent commitment completion, adds optional completion comments,
-- and creates indexes for user activity history.

-- 1. Extend daily_completions with optional comment (up to 1,000 characters)
alter table public.daily_completions
  add column if not exists comment text null,
  add constraint daily_completions_comment_length check (comment is null or length(comment) <= 1000);

comment on column public.daily_completions.comment is 'Optional user note describing work accomplished for this completion.';

-- 2. Indexes for user history, commitment history, and timeline queries
create index if not exists idx_daily_completions_user_completed_at
  on public.daily_completions (user_id, completed_at desc);

create index if not exists idx_daily_completions_user_commitment_history
  on public.daily_completions (user_id, commitment_id, completed_at desc);

-- 3. Permanent completion rule: remove DELETE permissions for users
drop policy if exists "daily_completions_delete_own" on public.daily_completions;

-- 4. Database triggers enforcing immutability of completion records and comments
create or replace function public.protect_daily_completion_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if auth.role() = 'authenticated' then
      raise exception 'Completion records are permanent and cannot be deleted or undone';
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if auth.role() = 'authenticated' then
      raise exception 'Completion records and comments are permanent and cannot be modified';
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_protect_daily_completion_immutability on public.daily_completions;
create trigger tr_protect_daily_completion_immutability
  before update or delete on public.daily_completions
  for each row
  execute function public.protect_daily_completion_immutability();

-- 5. Updated complete_commitment RPC accepting optional comment
drop function if exists public.complete_commitment(uuid, date);

create or replace function public.complete_commitment(
  p_commitment_id uuid,
  p_date date default null,
  p_comment text default null
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
  v_trimmed_comment text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Trim whitespace and treat empty as NULL
  v_trimmed_comment := nullif(trim(p_comment), '');
  if v_trimmed_comment is not null and length(v_trimmed_comment) > 1000 then
    raise exception 'Comment must be 1000 characters or fewer';
  end if;

  select timezone, myc_started_at into v_profile
  from public.profiles
  where user_id = v_user_id;

  if v_profile.timezone is null then
    raise exception 'User profile not found';
  end if;

  v_target_date := coalesce(p_date, (timezone(v_profile.timezone, now()))::date);

  -- Atomic insert with conflict protection.
  -- On duplicate submission, DO NOTHING guarantees original comment and completed_at are preserved.
  insert into public.daily_completions (user_id, commitment_id, date, status, completed_at, comment)
  values (v_user_id, p_commitment_id, v_target_date, 'completed', now(), v_trimmed_comment)
  on conflict (user_id, commitment_id, date) do nothing
  returning * into v_completion;

  -- If conflict occurred (already completed), return authoritative existing row
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

grant execute on function public.complete_commitment(uuid, date, text) to authenticated;

-- 6. Disable uncomplete_commitment RPC
create or replace function public.uncomplete_commitment(
  p_commitment_id uuid,
  p_date date default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Completions are permanent and cannot be undone or reverted';
end;
$$;

revoke execute on function public.uncomplete_commitment(uuid, date) from authenticated;
