-- RLS foundation
--
-- Every table created in the `public` schema (the schema exposed through the
-- Data API) gets Row Level Security enabled automatically. A table with RLS
-- enabled and no policies denies all access to the `anon` and `authenticated`
-- roles, so a forgotten `enable row level security` can never expose data.
-- Each user-owned table must still define its own policies; see
-- supabase/README.md.
--
-- This brings Supabase's dashboard "automatic RLS" option under version
-- control (same function and event trigger names), with two hardening changes:
--   * fails closed: if RLS cannot be enabled, the CREATE TABLE is aborted
--     instead of silently succeeding without RLS;
--   * the function is not executable by API roles.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
      and schema_name = 'public'
      and not in_extension
  loop
    execute format('alter table %s enable row level security', cmd.object_identity);
  end loop;
end;
$$;

comment on function public.rls_auto_enable() is
  'Event trigger function: enables RLS on every new table in the public schema.';

revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

drop event trigger if exists ensure_rls;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
