-- RLS guardrails. Run with `npm run db:test`.
-- Runs inside a transaction that is rolled back, so it leaves no trace.
begin;

-- Run as the role migrations use (the CLI connects to remote projects with a
-- temporary login role).
set local role postgres;
set local search_path = public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(5);

select ok(
  exists (select 1 from pg_event_trigger where evtname = 'ensure_rls' and evtenabled <> 'D'),
  'ensure_rls event trigger is installed and enabled'
);

select ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute'),
  'anon cannot execute rls_auto_enable()'
);

select ok(
  not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute'),
  'authenticated cannot execute rls_auto_enable()'
);

create table public.rls_guardrail_probe (id bigint);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.rls_guardrail_probe'::regclass),
  'new tables in public get RLS enabled automatically'
);

drop table public.rls_guardrail_probe;

select is_empty(
  $$
    select c.oid::regclass::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has RLS enabled'
);

select * from finish();

rollback;
