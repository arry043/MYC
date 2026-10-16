# Architecture

How MYC is built and why. For the product itself see [PRD.md](PRD.md); for the rules every
change must follow see [RULES.md](RULES.md); for the reasoning behind specific choices see
[DECISIONS.md](DECISIONS.md).

> **Current state:** foundation, design system and app shell (tasks 01–03 in
> [PHASES.md](PHASES.md)); pages show static sample content. Sections
> marked _Planned_ describe where future work goes, not code that exists today.

## 1. Principles

1. **Backend-first, client-independent.** Supabase owns users, commitments, completion
   history, dates, streaks, consistency and analytics (PRD §51). Clients present data and send
   user intent; they never hold business rules or a separate source of truth.
2. **One definition of every metric.** "Consistent day", streaks and consistency percentage are
   computed in one place (the database) so the calendar, dashboard, mobile app and widget can
   never disagree.
3. **Security in the database, not the client.** Row Level Security decides who can read or
   write each row. Clients only ever hold the public key.
4. **Shared contracts.** All clients use the same generated database types.
5. **Platform-specific presentation only.** The web PWA, Android app and Android widget are
   different views over the same data (PRD §9).

## 2. System overview

```text
                    ┌──────────────────────────────────────────────┐
                    │                   Supabase                    │
                    │  Postgres 17 · Auth · RLS · Realtime · Edge   │
                    │  Functions (privileged logic, service role)   │
                    └───────────────▲──────────────────▲────────────┘
                     Data API (JWT) │                  │ Data API (JWT)
              public key + session  │                  │  public key + session
                ┌───────────────────┴───┐          ┌───┴───────────────────────┐
                │ apps/web              │          │ apps/mobile               │
                │ Next.js 16 · PWA      │          │ Expo 57 · React Native    │
                │ desktop + mobile web  │          │ Android app               │
                └───────────────────────┘          │  └─ Android widget (planned)
                                                   └───────────────────────────┘
                     └─────────── packages/types · packages/utils ───────────┘
```

Every request from a client reaches Postgres as either the `anon` role (signed out) or the
`authenticated` role (signed in, with the user's JWT). RLS policies evaluated for that role are
the only authorization layer that matters; client checks exist only for UX.

## 3. Repository layout

| Path                              | Responsibility                                                           |
| --------------------------------- | ------------------------------------------------------------------------ |
| `apps/web`                        | Next.js web app and installable PWA                                      |
| `apps/mobile`                     | Expo / React Native app (Android first); later hosts the Android widget  |
| `packages/types` (`@myc/types`)   | Shared TypeScript types. `src/database.ts` is generated from the schema  |
| `packages/utils` (`@myc/utils`)   | Platform-agnostic helpers usable in browser, Node and React Native       |
| `packages/config` (`@myc/config`) | Shared tsconfig bases and ESLint rules                                   |
| `supabase/`                       | Database schema (migrations), database tests, Edge Functions, CLI config |
| `scripts/`                        | Repository scripts (database type generation)                            |
| `docs/`                           | Product and engineering documentation                                    |

npm workspaces link everything. Shared packages are **TypeScript source with no build step**:
Next.js (Turbopack) and Metro compile workspace packages directly, so a change in
`packages/*` is picked up immediately by both apps.

Dependency direction is strictly one-way:

```text
apps/*  ──►  packages/types, packages/utils  ──►  (nothing app-specific)
apps/*  ──►  packages/config (dev only)
```

Packages never import from apps, and `packages/utils` never imports platform APIs
(`next/*`, `react-native`, DOM-only APIs beyond `fetch`).

## 4. Web — `apps/web`

| Concern             | Implementation                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework           | Next.js 16.4 App Router, React 19.2, `cacheComponents` enabled                                                     |
| Styling             | Tailwind CSS 4; all design tokens in `src/app/globals.css` (D-16); Plus Jakarta Sans                               |
| Components          | `src/components/{ui,layout,navigation,progress,feedback,shared}`; primitives on Base UI (shadcn)                   |
| Motion              | `motion` (Framer Motion); tokens in `src/lib/motion.ts`; honours `prefers-reduced-motion` (D-17)                   |
| App shell           | Route group `src/app/(app)/`: layout (shell), template (page transition), loading, error                           |
| Routes              | `/dashboard`, `/calendar`, `/commitments`, `/analytics`, `/settings`: static samples (D-18)                        |
| Authentication      | `src/app/(auth)/` (login, signup, verify-email, forgot-password, reset-password), `src/app/auth/callback/route.ts` |
| Account Security    | `src/app/(app)/settings/_components/account-security-section.tsx`: Google linking, password management             |
| Route Guard / Proxy | `src/proxy.ts` (Next 16 proxy) — session refresh, route boundaries, and unverified email redirection (D-24)        |
| Supabase (browser)  | `src/lib/supabase/client.ts` — `createBrowserClient`, singleton in the browser                                     |
| Supabase (server)   | `src/lib/supabase/server.ts` — `createServerClient` with cookies, one per request, `server-only`                   |
| Env                 | `src/lib/env.ts` — validated lazily when a client is created                                                       |
| PWA                 | `src/app/manifest.ts`, `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icons/*`                              |
| Security headers    | `next.config.ts` — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`                                  |
| Dev diagnostics     | `src/app/api/dev/supabase/route.ts` — connectivity check, 404 in production                                        |
| Component gallery   | `src/app/(app)/dev/ui/` — every component and state, 404 in production                                             |

Layout breakpoints: phone (< 768px) has a compact header, single column and a bottom bar with
the four main sections (Settings in the header); tablet (768–1023px) has a labelled icon rail;
desktop (≥ 1024px) has a full sidebar. Spacing tokens shrink on smaller screens.

_Planned:_ a service worker for the basic offline shell.

## 5. Mobile — `apps/mobile`

| Concern         | Implementation                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Framework       | Expo SDK 57, React Native 0.86, New Architecture                                                                      |
| Entry           | `index.ts` → `src/App.tsx`                                                                                            |
| Supabase        | `src/lib/supabase.ts` — `getSupabase()` singleton; sessions persisted with `expo-sqlite`'s `localStorage`             |
| Env             | `src/lib/env.ts` — `EXPO_PUBLIC_*` variables, validated lazily                                                        |
| Native projects | Generated by `expo prebuild` (Continuous Native Generation); `android/` and `ios/` are never committed or hand-edited |
| Dev diagnostics | `src/dev/SupabaseStatus.tsx` — loaded only under `__DEV__`, absent from production bundles                            |

_Planned:_ Expo Router for navigation (`src/app/` routes); a development build (not Expo Go)
once native modules for the widget are added; the Android widget as a native module/config
plugin that reads the signed-in user's data through Supabase — never a separate data store
(PRD §31–32).

## 6. Backend — Supabase

| Concern        | Implementation                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Schema         | Only SQL migrations in `supabase/migrations/` define it ([supabase/README.md](../supabase/README.md)) |
| RLS guardrail  | `ensure_rls` event trigger enables RLS on every new `public` table and fails closed                   |
| Tests          | pgTAP in `supabase/tests/database/`, run with `npm run db:test`                                       |
| Types          | `npm run db:types` → `packages/types/src/database.ts`                                                 |
| Edge Functions | `supabase/functions/` (none yet) — the only place the service-role key may be used                    |
| Auth           | Supabase Auth (email/password first) — _planned in Phase 1.03_                                        |
| Realtime       | Enabled; used where live sync helps (e.g. completion state across devices) — _planned_                |

### Planned data model (PRD §33)

```text
auth.users ─┬─ 1:1 ─ profiles          (myc_started_at NULL until first "I COMMIT", timezone)
            ├─ 1:n ─ commitments       (title, schedule/frequency, status lifecycle)
            └─ 1:n ─ daily_completions (commitment_id, date, status, completed_at)
                                        unique (commitment_id, date)
```

- Every table carries `user_id` and owner-only RLS policies.
- `date` columns hold the **user's local calendar date** (per `profiles.timezone`), never a
  UTC-derived date, so history doesn't shift when viewed from another timezone.
- Rules with integrity impact live in the database: `myc_started_at` is set once by the first
  "I COMMIT"; future dates can't be completed; duplicate completions are rejected by a unique
  constraint.
- Streaks and consistency are computed by SQL functions/views over `daily_completions`, so
  every client gets identical numbers.

## 7. Type flow

```text
supabase/migrations/*.sql ──(npm run db:push)──► development Postgres
                                                     │
                                         (npm run db:types)
                                                     ▼
                                   packages/types/src/database.ts
                                                     │
                     ┌───────────────────────────────┴──────────────────────┐
                     ▼                                                      ▼
     createBrowserClient/createServerClient<Database>        createClient<Database> (mobile)
```

`npm run db:types:check` fails when the committed file no longer matches the schema.

## 8. Security model

| Credential                                  | Where it may live                                                       | Notes                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| Project URL                                 | Client env vars                                                         | Public                                                   |
| Anon / publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`                                        | Public by design; RLS protects data                      |
| User session (JWT)                          | Web: HTTP cookies via `@supabase/ssr`. Mobile: on-device SQLite storage | Never logged                                             |
| Service-role / secret key (`sb_secret_…`)   | Supabase Edge Function secrets only                                     | Bypasses RLS. ESLint fails on any app code that reads it |
| Database password, CLI access token         | Developer machine / CI secrets                                          | Never in the repo                                        |

Layers: RLS on every table → owner-only policies → server-only modules on web
(`import "server-only"`) → lint guard against privileged keys → env validation → no secrets in
logs or committed files.

## 9. Environments

|                  | Development                                       | Production                                                                     |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Supabase project | `MYC` (`nsayfmlholzfwyxbtdgy`), linked to the CLI | Separate project (not created yet)                                             |
| Client config    | `apps/*/.env.local` (git-ignored)                 | Vercel env vars (web), EAS environment variables (mobile)                      |
| Migrations       | `npm run db:push`                                 | `npx supabase db push --project-ref <prod-ref>` after they pass in development |
| Types            | Generated from development                        | Same migrations, so the same types                                             |

An optional local Supabase stack (`npm run db:start`, Docker) can stand in for the development
project.

## 10. Quality gates

| Command                              | Checks                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| `npm run check`                      | Prettier, ESLint (both apps), TypeScript strict (all workspaces) |
| `npm run build:web`                  | Production build of the web app                                  |
| `npm run db:test`                    | RLS guardrails and (later) per-table access tests                |
| `npm run db:types:check`             | Generated types match the schema                                 |
| `npx expo-doctor` (in `apps/mobile`) | Expo SDK / dependency consistency                                |
