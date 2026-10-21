-- Tests for Single Day commitments:
-- Schema, constraints, past-date rejection, conversion prevention,
-- journey start invariants, and completion eligibility.
-- Run with `npm run db:test`.
begin;

set local role postgres;
set local search_path = public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- 1. Schema tests
select has_column('public', 'commitments', 'scheduled_date', 'commitments has scheduled_date column');

-- 2. Mock users setup
create temporary table test_users (
  id uuid primary key,
  email text
);

insert into test_users (id, email)
values
  ('55555555-5555-5555-5555-555555555555', 'single_user1@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'single_user2@example.com');

insert into auth.users (id, email, aud, role)
values
  ('55555555-5555-5555-5555-555555555555', 'single_user1@example.com', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'single_user2@example.com', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Set up User 1 (Asia/Kolkata timezone)
set local role authenticated;
set local "request.jwt.claim.sub" to '55555555-5555-5555-5555-555555555555';
select public.ensure_profile('Asia/Kolkata');

-- 2. Trigger: single_day without scheduled_date fails
select throws_ok(
  $$
    insert into public.commitments (id, user_id, title, frequency, scheduled_date, status)
    values (
      '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '55555555-5555-5555-5555-555555555555',
      'Missing Date',
      'single_day',
      null,
      'draft'
    )
  $$,
  'Scheduled date is required for single-day commitments',
  'single_day without scheduled_date is rejected'
);

-- 3. Constraint: daily with scheduled_date fails check constraint
select throws_ok(
  $$
    insert into public.commitments (id, user_id, title, frequency, scheduled_date, status)
    values (
      '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '55555555-5555-5555-5555-555555555555',
      'Daily with date',
      'daily',
      '2026-11-20',
      'draft'
    )
  $$,
  '23514',
  'new row for relation "commitments" violates check constraint "commitments_scheduled_date_check"',
  'daily with scheduled_date violates check constraint'
);

-- 4. Trigger: single_day with schedule_days fails
select throws_ok(
  $$
    insert into public.commitments (id, user_id, title, frequency, scheduled_date, schedule_days, status)
    values (
      '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '55555555-5555-5555-5555-555555555555',
      'Single day with weekdays',
      'single_day',
      '2026-11-20',
      array[1, 2]::smallint[],
      'draft'
    )
  $$,
  'Schedule days must be empty for single-day commitments',
  'single_day with schedule_days violates rule'
);

-- 5. Trigger: past scheduled date is rejected on insert
select throws_ok(
  $$
    insert into public.commitments (id, user_id, title, frequency, scheduled_date, status)
    values (
      '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '55555555-5555-5555-5555-555555555555',
      'Past Event',
      'single_day',
      '2026-01-01',
      'draft'
    )
  $$,
  'Scheduled date cannot be in the past',
  'single_day with past date is rejected by trigger'
);

-- 6. Future single-day commitment can be created active without starting journey
insert into public.commitments (id, user_id, title, frequency, scheduled_date, status)
values (
  '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '55555555-5555-5555-5555-555555555555',
  'International Meeting',
  'single_day',
  '2026-11-20',
  'active'
);

select is(
  (select myc_started_at from public.profiles where user_id = '55555555-5555-5555-5555-555555555555'),
  null,
  'creating future single_day commitment does not start journey'
);

-- 7. Calling confirm_first_commitment on future single-day commitment fails
select throws_ok(
  $$
    select public.confirm_first_commitment('55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '2026-10-21'::date);
  $$,
  'Cannot start MYC journey with a future single-day commitment',
  'confirm_first_commitment fails on future single-day commitment'
);

-- 8. Start journey with a daily commitment via "I COMMIT"
insert into public.commitments (id, user_id, title, frequency, status)
values (
  '66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '55555555-5555-5555-5555-555555555555',
  'Daily Reading',
  'daily',
  'draft'
);

select ok(
  (select public.confirm_first_commitment('66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '2026-10-20'::date)) is not null,
  'confirm_first_commitment starts journey for User 1'
);

-- 9. Accidental conversion prevention: daily -> single_day
select throws_ok(
  $$
    update public.commitments
    set frequency = 'single_day', scheduled_date = '2026-11-20', schedule_days = null
    where id = '66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  $$,
  'Commitment frequency cannot be converted between recurring and single day',
  'cannot convert daily to single_day'
);

-- 10. Accidental conversion prevention: single_day -> daily
select throws_ok(
  $$
    update public.commitments
    set frequency = 'daily', scheduled_date = null
    where id = '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  $$,
  'Commitment frequency cannot be converted between recurring and single day',
  'cannot convert single_day to daily'
);

-- 11. Create a single-day commitment scheduled for today (2026-10-21 in Asia/Kolkata)
insert into public.commitments (id, user_id, title, frequency, scheduled_date, status)
values (
  '77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '55555555-5555-5555-5555-555555555555',
  'Doctor Appointment Today',
  'single_day',
  '2026-10-21',
  'active'
);

-- Attempt completing single_day commitment for the WRONG date (2026-10-20)
select throws_ok(
  $$
    insert into public.daily_completions (user_id, commitment_id, date, status)
    values (
      '55555555-5555-5555-5555-555555555555',
      '77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-20',
      'completed'
    );
  $$,
  'Commitment is only scheduled for 2026-10-21',
  'cannot complete single_day commitment on the wrong date'
);

-- 12. Complete single_day commitment on its exact scheduled date (2026-10-21)
select ok(
  (select public.complete_commitment('77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '2026-10-21'::date, 'Attended on time'::text)) is not null,
  'successfully completed single_day commitment on scheduled date'
);

-- 13. Cannot modify scheduled_date once completed
select throws_ok(
  $$
    update public.commitments
    set scheduled_date = '2026-10-22'
    where id = '77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  $$,
  'Cannot change scheduled date of a completed commitment',
  'cannot change scheduled_date after completion'
);

select * from finish();

rollback;

