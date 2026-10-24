-- Migration: notification_preferences
-- Implements Phase 17 — Notification preferences and cross-platform reminder settings.

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  daily_reminder_enabled boolean not null default true,
  daily_reminder_time text not null default '09:00',
  incomplete_reminder_enabled boolean not null default true,
  incomplete_reminder_time text not null default '20:00',
  streak_reminder_enabled boolean not null default true,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_daily_time_check check (daily_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint notification_preferences_incomplete_time_check check (incomplete_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

comment on table public.notification_preferences is 'User-configurable notification and reminder preferences per user.';

-- RLS policies (RLS auto-enabled via ensure_rls trigger)
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Protect user_id and created_at from modification
create or replace function public.protect_notification_preferences_fields()
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

  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_notification_preferences_fields_trigger
  before update on public.notification_preferences
  for each row
  execute function public.protect_notification_preferences_fields();

