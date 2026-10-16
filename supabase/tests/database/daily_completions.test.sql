-- Tests for daily_completions, RLS, scheduling validation, and complete/uncomplete RPCs.
-- Run with `npm run db:test`.
begin;

set local role postgres;
set local search_path = public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- 1. Schema tests
select has_table('public', 'daily_completions', 'public.daily_completions table exists');
select has_column('public', 'daily_completions', 'commitment_id', 'daily_completions has commitment_id column');
select has_column('public', 'daily_completions', 'date', 'daily_completions has date column');
select has_column('public', 'daily_completions', 'completed_at', 'daily_completions has completed_at column');

-- 2. Mock users and commitments setup
create temporary table test_users (
  id uuid primary key,
  email text
);

insert into test_users (id, email)
values
  ('33333333-3333-3333-3333-333333333333', 'comp_user1@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'comp_user2@example.com');

insert into auth.users (id, email, aud, role)
values
  ('33333333-3333-3333-3333-333333333333', 'comp_user1@example.com', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'comp_user2@example.com', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Set up User 1 profile with journey started
set local role authenticated;
set local "request.jwt.claim.sub" to '33333333-3333-3333-3333-333333333333';

-- Initialize profile and start journey on 2026-10-01
select public.ensure_profile('Asia/Kolkata');

-- Temporarily bypass internal confirmation check to set myc_started_at in test
set local "myc.internal_confirmation" to 'true';
update public.profiles
set myc_started_at = '2026-10-01'
where user_id = '33333333-3333-3333-3333-333333333333';
reset "myc.internal_confirmation";

-- Create active daily commitment for User 1
insert into public.commitments (id, user_id, title, frequency, schedule_days, start_date, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  'Daily Coding Practice',
  'daily',
  array[1,2,3,4,5,6,7]::smallint[],
  '2026-10-01',
  'active'
);

-- Create active specific_days (Mon=1, Wed=3, Fri=5) commitment for User 1
insert into public.commitments (id, user_id, title, frequency, schedule_days, start_date, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333',
  'Workout MWF',
  'specific_days',
  array[1,3,5]::smallint[],
  '2026-10-01',
  'active'
);

-- Create paused commitment for User 1
insert into public.commitments (id, user_id, title, frequency, schedule_days, start_date, status)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  'Paused Painting',
  'daily',
  array[1,2,3,4,5,6,7]::smallint[],
  '2026-10-01',
  'paused'
);

-- Set up User 2 commitment
set local role authenticated;
set local "request.jwt.claim.sub" to '44444444-4444-4444-4444-444444444444';
select public.ensure_profile('UTC');
set local "myc.internal_confirmation" to 'true';
update public.profiles set myc_started_at = '2026-10-01' where user_id = '44444444-4444-4444-4444-444444444444';
reset "myc.internal_confirmation";

insert into public.commitments (id, user_id, title, frequency, schedule_days, start_date, status)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '44444444-4444-4444-4444-444444444444',
  'User 2 Commitment',
  'daily',
  array[1,2,3,4,5,6,7]::smallint[],
  '2026-10-01',
  'active'
);

-- 3. Back to User 1 testing
set local role authenticated;
set local "request.jwt.claim.sub" to '33333333-3333-3333-3333-333333333333';

-- Test complete_commitment for today
select ok(
  (select (public.complete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-10'::date))->>'id') is not null,
  'complete_commitment succeeds for eligible date'
);

-- Test idempotency of complete_commitment (calling again on same date doesn't error)
select ok(
  (select (public.complete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-10'::date))->>'id') is not null,
  'complete_commitment is idempotent on duplicate call'
);

-- Test User 1 cannot complete User 2's commitment
select throws_ok(
  $$
    select public.complete_commitment('dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-10-10'::date)
  $$,
  'Unauthorized: commitment belongs to another user',
  'cannot complete another user commitment'
);

-- Test future-date protection
select throws_ok(
  $$
    select public.complete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2099-01-01'::date)
  $$,
  'Cannot complete commitments for future dates',
  'future completion dates are rejected'
);

-- Test prior to journey start protection
select throws_ok(
  $$
    select public.complete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2020-01-01'::date)
  $$,
  'Cannot complete commitments for dates prior to journey start date (2026-10-01)',
  'completion prior to myc_started_at is rejected'
);

-- Test paused commitment cannot be completed
select throws_ok(
  $$
    select public.complete_commitment('cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-10-10'::date)
  $$,
  'Cannot complete commitment with status: paused',
  'paused commitment completion is rejected'
);

-- Test specific_days scheduling validation (2026-10-11 was Sunday = 7, MWF commitment not scheduled)
select throws_ok(
  $$
    select public.complete_commitment('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-11'::date)
  $$,
  'Commitment is not scheduled for day of week 7',
  'unscheduled day of week completion is rejected'
);

-- Test uncomplete_commitment RPC
select is(
  (select public.uncomplete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-10'::date)),
  true,
  'uncomplete_commitment successfully removes completion'
);

-- Verify record is gone
select is(
  (select count(*)::integer from public.daily_completions where commitment_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and date = '2026-10-10'),
  0,
  'daily_completions row was removed by uncomplete_commitment'
);

-- Test uncomplete_commitment idempotency (repeated call succeeds)
select is(
  (select public.uncomplete_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-10'::date)),
  true,
  'uncomplete_commitment is idempotent when already uncompleted'
);

select * from finish();
rollback;

