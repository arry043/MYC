-- Tests for notification_preferences table and RLS policies.
-- Run with `npm run db:test`.
begin;

set local role postgres;
set local search_path = public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- 1. Schema tests
select has_table('public', 'notification_preferences', 'public.notification_preferences table exists');
select has_column('public', 'notification_preferences', 'enabled', 'notification_preferences has enabled column');
select has_column('public', 'notification_preferences', 'daily_reminder_time', 'notification_preferences has daily_reminder_time column');
select has_column('public', 'notification_preferences', 'incomplete_reminder_time', 'notification_preferences has incomplete_reminder_time column');

-- 2. Mock users for RLS testing
insert into auth.users (id, email, aud, role)
values
  ('a1111111-1111-1111-1111-111111111111', 'notify1@example.com', 'authenticated', 'authenticated'),
  ('a2222222-2222-2222-2222-222222222222', 'notify2@example.com', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 3. Test insert & select as authenticated user1
set local role authenticated;
set local "request.jwt.claim.sub" to 'a1111111-1111-1111-1111-111111111111';

insert into public.notification_preferences (user_id, enabled, daily_reminder_time, incomplete_reminder_time)
values ('a1111111-1111-1111-1111-111111111111', true, '08:30', '21:00');

select results_eq(
  $$ select enabled, daily_reminder_time, incomplete_reminder_time from public.notification_preferences where user_id = 'a1111111-1111-1111-1111-111111111111' $$,
  $$ values (true, '08:30', '21:00') $$,
  'User 1 can insert and select their own notification preferences'
);

-- 4. Test RLS isolation: user 2 cannot see user 1's preferences
set local "request.jwt.claim.sub" to 'a2222222-2222-2222-2222-222222222222';

select is_empty(
  $$ select * from public.notification_preferences where user_id = 'a1111111-1111-1111-1111-111111111111' $$,
  'User 2 cannot select User 1 notification preferences'
);

-- 5. User 2 cannot update User 1 preferences
update public.notification_preferences
set enabled = false
where user_id = 'a1111111-1111-1111-1111-111111111111';

select is_empty(
  $$ select * from public.notification_preferences where user_id = 'a1111111-1111-1111-1111-111111111111' and enabled = false $$,
  'User 2 update on User 1 preferences is blocked by RLS'
);

-- 6. Check time format regex constraint
set local "request.jwt.claim.sub" to 'a2222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ insert into public.notification_preferences (user_id, daily_reminder_time) values ('a2222222-2222-2222-2222-222222222222', '25:99') $$,
  '23514',
  NULL,
  'Invalid time string is rejected by check constraint'
);

select * from finish();
rollback;

