-- Tests for profiles, commitments, and "I COMMIT" atomic confirmation.
-- Run with `npm run db:test`.
begin;

set local role postgres;
set local search_path = public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- 1. Schema tests
select has_table('public', 'profiles', 'public.profiles table exists');
select has_table('public', 'commitments', 'public.commitments table exists');

select has_column('public', 'profiles', 'myc_started_at', 'profiles has myc_started_at column');
select has_column('public', 'commitments', 'frequency', 'commitments has frequency column');
select has_column('public', 'commitments', 'schedule_days', 'commitments has schedule_days column');

-- 2. Mock users for RLS & business logic testing
create temporary table test_users (
  id uuid primary key,
  email text
);

insert into test_users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com');

-- Also insert into auth.users so foreign keys pass
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 3. Set role to authenticated as user1
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

-- Create profile for user 1
select ok(
  (select id from public.ensure_profile('Asia/Kolkata')) is not null,
  'ensure_profile initializes profile for authenticated user'
);

-- Check initial myc_started_at is NULL
select is(
  (select myc_started_at from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  null,
  'new profile starts with myc_started_at = NULL'
);

-- Check that regular client update cannot modify myc_started_at
select throws_ok(
  $$
    update public.profiles
    set myc_started_at = '2026-10-16'
    where user_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'myc_started_at can only be set via confirm_first_commitment ("I COMMIT")',
  'direct client update of myc_started_at is blocked by trigger'
);

-- Create draft commitment
insert into public.commitments (id, user_id, title, frequency, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Solve 3 DSA Problems',
  'daily',
  'draft'
);

-- Verify that direct activation of first commitment is blocked
select throws_ok(
  $$
    update public.commitments
    set status = 'active'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'The first commitment must be officially activated through "I COMMIT"',
  'direct activation of first commitment without I COMMIT is blocked'
);

-- Execute atomic "I COMMIT"
select ok(
  (select public.confirm_first_commitment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '2026-10-16'::date)) is not null,
  'confirm_first_commitment succeeds'
);

-- Verify profile myc_started_at is now established
select is(
  (select myc_started_at from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  '2026-10-16'::date,
  'myc_started_at is set to the confirmation local date'
);

-- Verify commitment is now active
select is(
  (select status from public.commitments where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'active',
  'commitment status is updated to active'
);

select * from finish();

rollback;

