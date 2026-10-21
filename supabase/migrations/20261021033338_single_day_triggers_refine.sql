-- Migration: single_day_triggers_refine
-- Refines trigger error checks for single-day commitments

-- 1. Refine check_commitment_rules
create or replace function public.check_commitment_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_myc_started_at date;
  v_profile_tz text;
  v_user_today date;
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'Commitment owner cannot be modified';
  end if;

  new.updated_at = now();

  -- Disallow converting between recurring and single_day
  if tg_op = 'UPDATE' and old.frequency <> new.frequency then
    if (old.frequency = 'single_day' and new.frequency <> 'single_day')
       or (old.frequency <> 'single_day' and new.frequency = 'single_day') then
      raise exception 'Commitment frequency cannot be converted between recurring and single day';
    end if;
  end if;

  -- Default schedule days for daily
  if new.frequency = 'daily' and (new.schedule_days is null or cardinality(new.schedule_days) = 0) then
    new.schedule_days := array[1,2,3,4,5,6,7]::smallint[];
  end if;

  -- Fetch user profile details (timezone and journey start date)
  select timezone, myc_started_at
  into v_profile_tz, v_myc_started_at
  from public.profiles
  where user_id = new.user_id;

  v_user_today := (timezone(coalesce(v_profile_tz, 'UTC'), now()))::date;

  -- Handling for single_day commitments
  if new.frequency = 'single_day' then
    if new.scheduled_date is null then
      raise exception 'Scheduled date is required for single-day commitments';
    end if;

    if new.schedule_days is not null and cardinality(new.schedule_days) > 0 then
      raise exception 'Schedule days must be empty for single-day commitments';
    end if;

    new.schedule_days := null;
    new.start_date := new.scheduled_date;
    new.end_date := new.scheduled_date;

    -- Validate past date rejection on insert or if date was changed
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.scheduled_date <> old.scheduled_date) then
      if new.scheduled_date < v_user_today then
        raise exception 'Scheduled date cannot be in the past';
      end if;
    end if;

    -- Disallow changing scheduled date of an already completed commitment
    if tg_op = 'UPDATE' and new.scheduled_date <> old.scheduled_date then
      if exists (select 1 from public.daily_completions where commitment_id = new.id) then
        raise exception 'Cannot change scheduled date of a completed commitment';
      end if;
    end if;
  end if;

  -- Ensure first commitment can only be activated through confirm_first_commitment
  -- Exception: Future single_day commitments can be created as active without starting the journey
  if v_myc_started_at is null and new.status = 'active' then
    if new.frequency = 'single_day' and new.scheduled_date > v_user_today then
      -- Allowed! It is a future single-day commitment and does not silently start the journey.
      null;
    elsif current_setting('myc.internal_confirmation', true) is distinct from 'true' then
      raise exception 'The first commitment must be officially activated through "I COMMIT"';
    end if;
  end if;

  return new;
end;
$$;

-- 2. Refine check_daily_completion_rules
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
  select id, user_id, status, start_date, end_date, frequency, schedule_days, scheduled_date
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

  -- Check commitment status
  if v_commitment.status <> 'active' then
    raise exception 'Cannot complete commitment with status: %', v_commitment.status;
  end if;

  -- Scheduling checks based on frequency first
  if v_commitment.frequency = 'single_day' then
    if new.date <> v_commitment.scheduled_date then
      raise exception 'Commitment is only scheduled for %', v_commitment.scheduled_date;
    end if;
  elsif v_commitment.frequency = 'specific_days' then
    v_dow := extract(isodow from new.date)::smallint;
    if v_commitment.schedule_days is null or not (v_dow = any(v_commitment.schedule_days)) then
      raise exception 'Commitment is not scheduled for day of week %', v_dow;
    end if;
  end if;

  -- Date range check for recurring commitments
  if new.date < v_commitment.start_date then
    raise exception 'Cannot complete commitment before its start date (%)', v_commitment.start_date;
  end if;

  if v_commitment.end_date is not null and new.date > v_commitment.end_date then
    raise exception 'Cannot complete commitment after its end date (%)', v_commitment.end_date;
  end if;

  return new;
end;
$$;

