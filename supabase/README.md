# MYC database (Supabase)

The database schema is defined **only** by the SQL migrations in `migrations/`. Never change
the schema in the Supabase dashboard: anything not in a migration does not exist for other
environments, and will be lost or conflict on the next push.

```text
supabase/
  config.toml        CLI + local stack configuration
  migrations/        Timestamped SQL migrations, applied in order
  tests/database/    pgTAP tests (run against the linked project)
  functions/         Edge Functions (none yet)
  seed.sql           Seed data for the optional local stack
```

## Migrations

```bash
npm run db:migration:new -- <name>   # creates migrations/<timestamp>_<name>.sql
npm run db:push:dry                  # preview what would be applied to the linked project
npm run db:push                      # apply pending migrations to the linked project
npm run db:migrations                # compare local vs. applied migrations
npm run db:test                      # run pgTAP tests against the linked project
npm run db:types                     # regenerate packages/types/src/database.ts
```

Rules:

- One concern per migration; never edit a migration that has been applied anywhere. Fix
  forward with a new migration.
- Every schema change is followed by `npm run db:types` and committing the result.
- Production only ever receives migrations that were already applied and tested in
  development (see the root README).

## Row Level Security

RLS is mandatory for every table in the `public` schema, because `public` is exposed to clients
through the Data API using the public anon/publishable key.

**Guardrails already in place** (`20261007133550_rls_foundation.sql`):

- The `ensure_rls` event trigger enables RLS on every new `public` table automatically. If it
  cannot, the `CREATE TABLE` fails. A table with RLS and no policies denies all client access.
- `tests/database/rls.test.sql` fails if any `public` table has RLS disabled.

**Every user-owned table must** follow this template, so that User A can only ever read and
write User A's rows:

```sql
create table public.<table> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- ...columns...
  created_at timestamptz not null default now()
);

-- Enabled automatically by ensure_rls; stated explicitly for readability.
alter table public.<table> enable row level security;

create index <table>_user_id_idx on public.<table> (user_id);

create policy "<table>: owner can select" on public.<table>
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "<table>: owner can insert" on public.<table>
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "<table>: owner can update" on public.<table>
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "<table>: owner can delete" on public.<table>
  for delete to authenticated using ((select auth.uid()) = user_id);
```

- Grant policies to `authenticated` only; never `using (true)` on user data, and no policies
  for `anon` unless data is genuinely public.
- `(select auth.uid())` instead of `auth.uid()` lets Postgres evaluate it once per query.
- Omit a policy to forbid that operation (e.g. no `delete` policy if history must be kept).
- Add a pgTAP test per table proving that one user cannot read or modify another user's rows.
- The service-role / secret key bypasses RLS. It is never used by the web or mobile apps;
  privileged operations belong in Edge Functions.
