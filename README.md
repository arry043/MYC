# MYC — Make Yourself Consistent

MYC is a consistency platform. Users define their own commitments, confirm them with
**I COMMIT**, complete them daily, and see proof of their consistency through streaks, a
contribution-style calendar, analytics and (on Android) a home-screen widget.

> Don't rely on motivation. Build consistency.

**Status:** foundation complete (project setup, Supabase backend, design system and app shell).
The app pages show static sample content; no product features yet.
See [docs/PHASES.md](docs/PHASES.md) for the roadmap.

## Documentation

| Document                                     | Contents                                            |
| -------------------------------------------- | --------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                   | Product requirements (source of truth)              |
| [docs/PHASES.md](docs/PHASES.md)             | Roadmap, current task, scope of each task           |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together                        |
| [docs/RULES.md](docs/RULES.md)               | Development rules and definition of done            |
| [docs/DECISIONS.md](docs/DECISIONS.md)       | Decision log and open questions                     |
| [supabase/README.md](supabase/README.md)     | Migrations, RLS policy template, database tests     |
| [AGENTS.md](AGENTS.md)                       | Guide for AI coding agents (`CLAUDE.md` imports it) |

## Architecture

One backend, multiple clients. Supabase owns all data and business rules (enforced with Row
Level Security); clients only present and interact with it.

```text
                Supabase (Auth · Postgres · RLS · Realtime · Edge Functions)
                                        │
                  ┌─────────────────────┴─────────────────────┐
                  ▼                                           ▼
          apps/web — Next.js PWA                 apps/mobile — Expo (Android)
                                                              └── Android widget (later)
                  └──────────── packages/* (shared types & utils) ───────────┘
```

## Repository structure

```text
apps/
  web/              Next.js 16 (App Router) + Tailwind CSS 4 + shadcn/ui, installable PWA
  mobile/           Expo SDK 57 / React Native app (Android first)
packages/
  types/            @myc/types  — shared TypeScript types (generated Supabase `Database` type)
  utils/            @myc/utils  — platform-agnostic helpers (env validation, Supabase check)
  config/           @myc/config — shared tsconfig bases and ESLint rules
supabase/           Database: config, migrations, pgTAP tests, Edge Functions (see supabase/README.md)
scripts/            Repository scripts (database type generation)
docs/               Product and engineering documentation
```

Shared packages are TypeScript source with no build step: Next.js (Turbopack) and Metro
compile workspace packages directly.

## Tech stack

| Area    | Stack                                                                   |
| ------- | ----------------------------------------------------------------------- |
| Web     | Next.js 16, React 19, TypeScript, App Router, Tailwind CSS 4, shadcn/ui |
| Mobile  | Expo SDK 57, React Native 0.86, TypeScript                              |
| Backend | Supabase: PostgreSQL, Auth, RLS, Realtime, Edge Functions               |
| Tooling | npm workspaces, TypeScript (strict), ESLint, Prettier                   |

## Prerequisites

- Node.js 20.19+ and npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (Docker runs `db:test` and
  the optional local stack)
- For Android: [Expo Go](https://expo.dev/go) on a device, or Android Studio with an emulator

## Local setup

```bash
npm install                                          # installs every workspace
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Then fill in the env files and link the Supabase CLI as described in
[Supabase setup](#supabase-setup).

## Environment variables

| Variable                        | App    | Description                                                                   |
| ------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | web    | Supabase project URL                                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web    | Supabase anon (publishable) key                                               |
| `EXPO_PUBLIC_SUPABASE_URL`      | mobile | Supabase project URL (use your LAN IP for a local stack on a physical device) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Supabase anon (publishable) key                                               |

Variables are validated when a Supabase client is first created (`src/lib/env.ts` in each
app), with a clear error naming any missing value.

**Security:** `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are shipped to users. Only the anon /
publishable key belongs there, since RLS protects the data. Never put the Supabase
service-role / secret key in any client app or committed file. `.env*` files are git-ignored;
only `.env.example` files are tracked.

## Supabase setup

Supabase is the single backend for every client. The schema lives in
[`supabase/migrations`](supabase/migrations); conventions and the RLS policy template are in
[`supabase/README.md`](supabase/README.md).

### 1. Projects

Use separate Supabase projects per environment, and never mix their credentials:

| Environment | Supabase project                       | Client config comes from                   |
| ----------- | -------------------------------------- | ------------------------------------------ |
| Development | `MYC` (`nsayfmlholzfwyxbtdgy`)         | `apps/*/.env.local` (git-ignored)          |
| Production  | a separate project (create when ready) | Deployment platform env vars (Vercel, EAS) |

The Supabase CLI is linked to the **development** project, so every `db:*` script targets
development by default:

```bash
npx supabase login
npx supabase link --project-ref nsayfmlholzfwyxbtdgy
```

### 2. Environment variables

Copy the URL and the **publishable** key from Dashboard → Project Settings → API Keys into
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web) and
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile). Missing or malformed
values fail with an error naming the variable when a Supabase client is created.

### 3. Clients

| Where                                                     | Module                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| Web — Client Components                                   | `apps/web/src/lib/supabase/client.ts`                         |
| Web — Server Components, Route Handlers, Server Functions | `apps/web/src/lib/supabase/server.ts` (`server-only`)         |
| Mobile                                                    | `apps/mobile/src/lib/supabase.ts` (`getSupabase()` singleton) |

All clients use the public key and are typed with the generated `Database` type from
`@myc/types`. Create clients only through these modules.

### 4. Development workflow

```bash
npm run db:migration:new -- <name>   # write SQL in supabase/migrations/<timestamp>_<name>.sql
npm run db:push:dry                  # preview against the development project
npm run db:push                      # apply to the development project
npm run db:test                      # pgTAP tests (RLS guardrails) against development
npm run db:types                     # regenerate packages/types/src/database.ts; commit it
```

Connectivity checks (development only):

- **Web:** `npm run dev:web`, then open <http://localhost:3000/api/dev/supabase>. It returns
  404 in production builds.
- **Mobile:** the app shows a `Supabase: connected` line in development builds only; it is
  stripped from production bundles.

Optional local stack (Docker): `npm run db:start` starts Supabase locally and prints a local
URL and key for `.env.local`; `npm run db:reset` rebuilds it from migrations;
`npm run db:types:local` generates types from it.

### 5. Production workflow

1. Create the production project in the dashboard (same region and Postgres version as
   development).
2. Apply migrations explicitly by project ref, so the CLI link never has to change:
   ```bash
   npx supabase db push --project-ref <prod-ref> --dry-run
   npx supabase db push --project-ref <prod-ref>
   ```
3. Set the production URL and publishable key in Vercel (web) and EAS environment variables
   (mobile, `npx eas-cli env:create --environment production`).
4. Types are always generated from development; production must be on the same migrations, so
   `npm run db:types:check` (exits 1 if the committed types are stale) is sufficient in CI.

### 6. Security

- RLS is mandatory: new `public` tables get RLS automatically, and `npm run db:test` fails if
  any table lacks it. User-owned tables must use the owner-only policy template.
- Clients only ever use the public anon/publishable key. The service-role / secret key is
  never used in `apps/*`; ESLint fails on any code that reads it. Privileged work goes in
  Edge Functions.
- Server-only code in web is marked with `import "server-only"`.
- Secrets and tokens are never logged; the connectivity checks never echo keys.

## Running the web app

```bash
npm run dev:web       # http://localhost:3000
npm run build:web     # production build
```

PWA installability needs HTTPS (or `localhost`). To test install on another device, deploy
over HTTPS or run `npx next dev --experimental-https` in `apps/web`.

## Design system

Every MYC screen uses the same tokens and components. Don't hard-code colours, sizes or shadows.

| What               | Where (`apps/web/src/…`)                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Tokens             | `app/globals.css`: colours, `type-*` text styles, spacing (`p-card`, `gap-section`…), radius, shadows, easing |
| Motion tokens      | `lib/motion.ts` (Framer Motion, via the `motion` package)                                                     |
| Primitives         | `components/ui/`: button, inputs, select, checkbox, switch, card, badge, alert, dialog, dropdown, toast…      |
| Shell & navigation | `components/layout/`, `components/navigation/` (sidebar, tablet rail, phone bottom bar)                       |
| Progress & charts  | `components/progress/`: ring, linear bar, column chart, metric indicator                                      |
| States             | `components/feedback/`: empty, error, success, skeletons, page loading                                        |

In development, **http://localhost:3000/dev/ui** shows every component and state (404 in
production). Changing a token, e.g. `--primary`, restyles the whole app.

## Progressive Web App (PWA)

The Web app is an installable, production-ready Progressive Web App:

- **Installation:** Installable on desktop and mobile browsers (Chrome, Edge, Brave, Android, and iOS Safari via "Add to Home Screen"). The Settings page (`/settings`) displays installation status and tailored installation prompts.
- **Smart Install Popup:** Intelligent, non-intrusive floating popup that prompts eligible users after a 10-second delay. Respects a 7-day dismissal cooldown in `localStorage`, avoids sensitive routes (`/onboarding`, `/offline`), and is permanently suppressed once installed or in standalone mode.
- **Vanilla Service Worker (`public/sw.js`):** Built with zero third-party webpack build dependencies for seamless compatibility with Next.js 16 and Turbopack.
- **Secure Caching:** Static bundles and icons are Cache-First; HTML navigations are Network-First with a pre-cached `/offline` fallback. Supabase API requests, sessions, and mutations are strictly Network-Only and never saved to Cache Storage.
- **Data Integrity:** The `/offline` shell clearly explains that consistency records require an active network connection, avoiding fake offline states or simulated streaks.
- **Controlled Updates:** Discreet update notification toast prompts users to refresh when a new version is waiting, guarded against infinite reload loops.

## Running the mobile app

```bash
npm run dev:mobile    # starts Metro; scan the QR code with Expo Go
npm run android       # starts Metro and opens an Android emulator/device
```

## Scripts

Run from the repository root:

| Command                              | Description                                                         |
| ------------------------------------ | ------------------------------------------------------------------- |
| `npm run dev:web`                    | Start the Next.js dev server                                        |
| `npm run dev:mobile`                 | Start the Expo dev server                                           |
| `npm run android`                    | Start Expo and open on Android                                      |
| `npm run build:web`                  | Production build of the web app                                     |
| `npm run lint`                       | ESLint across all workspaces                                        |
| `npm run typecheck`                  | TypeScript (strict) across all workspaces                           |
| `npm run format`                     | Format everything with Prettier                                     |
| `npm run format:check`               | Check formatting                                                    |
| `npm run check`                      | format:check + lint + typecheck                                     |
| `npm run db:migration:new -- <name>` | Create a new timestamped migration                                  |
| `npm run db:push:dry` / `db:push`    | Preview / apply pending migrations (linked dev project)             |
| `npm run db:migrations`              | List local vs. applied migrations                                   |
| `npm run db:test`                    | Run pgTAP database tests against the linked project                 |
| `npm run db:types`                   | Regenerate `packages/types/src/database.ts` from the linked project |
| `npm run db:types:check`             | Fail if the committed database types are out of date                |
| `npm run db:start` / `db:stop`       | Start / stop the optional local Supabase stack                      |
| `npm run db:reset`                   | Recreate the local database from migrations and seed                |
| `npm run db:types:local`             | Regenerate database types from the local stack                      |

## Conventions

- **Imports** are grouped (and lint-enforced): packages → `@myc/*` → `@/*` → relative.
- **Path aliases:** `@/*` maps to `src/*` in both apps; shared code is imported as `@myc/*`.
- **Dependencies:** add mobile dependencies with `npx expo install <pkg>` (run in
  `apps/mobile`) so versions match the Expo SDK. Both apps share a single React version,
  which React Native requires.
- **Database types:** after changing migrations, run `npm run db:types`.
