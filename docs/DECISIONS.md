# Decisions

Why MYC is built the way it is. Add an entry whenever a choice would surprise someone reading the
code later, and never delete entries; mark them **Superseded by D-xx** instead.

Format: context, then the decision, then its consequences.

## Decision log

### D-01 · npm workspaces monorepo, no build orchestrator — 2026-10-07

Web, mobile and shared code must share types and stay in sync. npm was already available and
no other package manager was in use. **Decision:** a single npm-workspaces repo
(`apps/*`, `packages/*`), with no Turborepo/Nx. **Consequences:** one `package-lock.json`;
scripts run per workspace with `-w` / `--workspaces`. Revisit if builds get slow.

### D-02 · Shared packages ship TypeScript source — 2026-10-07

Turbopack (Next.js 16) and Metro (Expo SDK 52+) both compile workspace packages directly.
**Decision:** `packages/*` export `src/*.ts` with no build step or `transpilePackages` entry.
**Consequences:** no stale builds; packages must only use syntax and APIs both bundlers and every
runtime support.

### D-03 · One React version, pinned by Expo — 2026-10-07

The scaffolds wanted React 19.3.0 (Next.js) and 19.2.3 (Expo SDK 57). Two React copies break
React Native, whose renderer requires the exact version Expo pins; Next.js accepts any React 19.
**Decision:** React 19.2.3 everywhere. **Consequences:** React upgrades follow Expo SDK upgrades.

### D-04 · Blank Expo template; Expo Router deferred — 2026-10-07

The default template ships demo screens. **Decision:** `blank-typescript`; add Expo Router with
the first real screens (task 1.13). **Consequences:** `src/App.tsx` is a placeholder until then.

### D-05 · PWA starts with a manifest only — 2026-10-07

A valid manifest plus HTTPS is enough for installability (Next.js PWA guide). **Decision:**
manifest, icons and theme now; service worker with a basic offline shell in task 1.12.
**Consequences:** no offline support yet.

### D-06 · shadcn/ui `base-nova` style with the `cn` package — 2026-10-07

shadcn's current default (`--defaults`) uses Base UI primitives and the `cn` package (published
by shadcn as a compiled replacement for `clsx` + `tailwind-merge`). **Decision:** keep the
defaults. **Consequences:** add components with `npx shadcn@latest add`.

### D-07 · Env var names use `*_ANON_KEY`, holding the publishable key — 2026-10-07

Task 01 specified `NEXT_PUBLIC_SUPABASE_ANON_KEY`; Supabase now calls the client key the
"publishable key" (`sb_publishable_…`), and its quickstarts use `*_PUBLISHABLE_KEY`.
**Decision:** keep the `*_ANON_KEY` names and store the publishable key in them.
**Consequences:** when copying Supabase snippets, map `PUBLISHABLE_KEY` to `ANON_KEY`.

### D-08 · Environment validated lazily — 2026-10-07

Next.js and Expo only inline public variables referenced literally. **Decision:** each app's
`src/lib/env.ts` reads variables literally and validates them through `@myc/utils` when a
Supabase client is first created. **Consequences:** pages that don't use Supabase still
render while env is being set up; misconfiguration fails with a clear message at first use.

### D-09 · Cloud development project; local stack optional — 2026-10-07

The project owner chose Supabase cloud. **Decision:** the CLI is linked to the development
project `MYC` (`nsayfmlholzfwyxbtdgy`) and all `db:*` scripts target it; the Docker-based local
stack remains available but optional. **Consequences:** development data lives in the cloud;
production must be a separate project (D-14).

### D-10 · RLS enabled automatically, failing closed — 2026-10-07

The project was created with Supabase's dashboard "automatic RLS" option, which installed an
event trigger outside version control, swallowed errors (a table could be created without RLS)
and left the function executable by API roles. **Decision:** migration
`20261007133550_rls_foundation.sql` owns `public.rls_auto_enable()` and the `ensure_rls`
trigger (same names), re-raises failures, skips extension-owned tables, and revokes `EXECUTE`
from API roles. pgTAP tests guard it. **Consequences:** a new `public` table can't exist
without RLS; policies are still required per table.

### D-11 · Connectivity checks use the Auth health endpoint — 2026-10-07

There is no schema to query yet, and the Data API root accepts only secret keys.
**Decision:** dev checks call `/auth/v1/health` with the public key; the gateway returns 401 for
an invalid key, so this verifies URL and key without creating database objects.
**Consequences:** checks are development-only (web route 404s in production; the mobile
component is excluded from production bundles).

### D-12 · Types generated from the linked project, with a drift check — 2026-10-07

**Decision:** `scripts/db-types.sh` generates `packages/types/src/database.ts` from the linked
development project (`--local` for the local stack), writing through a temp file and formatting
with Prettier; `--check` exits 1 when stale. **Consequences:** the committed types are
reproducible; CI can run `npm run db:types:check`.

### D-13 · Privileged keys banned from client apps — 2026-10-07

**Decision:** a shared ESLint rule (`@myc/config/eslint/no-privileged-env`) fails on code in
either app that reads a service-role or secret key; privileged logic belongs in Edge Functions.
Web server-only modules use `import "server-only"`. **Consequences:** if web server code ever
needs a server secret, it goes in a `server-only` module with a recorded decision.

### D-14 · Production migrations by explicit project ref — 2026-10-07

Relinking the CLI to production risks running development commands against production.
**Decision:** the CLI stays linked to development; production uses
`npx supabase db push --project-ref <prod-ref>` (dry run first). **Consequences:** production
credentials never sit in the repo or the default CLI link.

### D-15 · Session-refresh proxy deferred to authentication — 2026-10-07

Supabase's Next.js quickstart adds middleware to refresh sessions. That only matters once users
sign in. **Decision:** add it in task 1.03 as `src/proxy.ts` (Next.js 16 renamed
`middleware.ts`). **Consequences:** the server client's cookie writes are ignored until then.

### D-16 · Design tokens live in `globals.css`; web is the reference — 2026-10-16

Task 03 asked for one place to change MYC's look. The visual reference image mentioned in the
task brief was not available in the repo or conversation, so the system follows the brief's
written direction: sky-blue primary, warm off-white background, white cards, restrained pastel
accents (lavender, peach, mint, sun), soft shadows, one sans-serif family (Plus Jakarta Sans).
**Decision:** every colour, `type-*` text style, semantic spacing step (`page`, `section`,
`card`, `stack`; smaller on phones), radius, shadow and easing is a token in
`apps/web/src/app/globals.css`; components use only semantic names. Text/surface pairs were
checked for WCAG AA (≥ 4.5:1). Progress and intensity use one hue (sky, light → dark). shadcn
components were restyled, not used with defaults. **Consequences:** the mobile app (task 14)
should derive its theme from these values, moving them into a shared `packages/*` module
then; until then, web is the source of truth. If the reference image turns up, compare
against it and adjust the tokens.

### D-17 · Framer Motion (`motion`) for animation; Base UI toast instead of Sonner — 2026-10-16

**Decision:** `motion` (Framer Motion's current package name) handles page transitions,
staggered entrances, progress fills and the shared-layout navigation indicator, with
`MotionConfig reducedMotion="user"`. A global CSS rule shortens transitions when
`prefers-reduced-motion` is set. Hover/press feedback uses CSS. Toasts are built on Base UI's
`Toast` (already installed) rather than shadcn's Sonner, to avoid adding `sonner` and
`next-themes`. **Consequences:** one new dependency (`motion`, web only); call `toast()` from
`@/components/ui/toast`.

### D-18 · Static sample content for the task-03 placeholder pages — 2026-10-16

RULES §1 forbids demo data, while task 03 requires placeholder pages that demonstrate the
design with static values. **Decision:** all sample values live in one module,
`apps/web/src/lib/sample-data.ts`. It holds no logic and no database access, and each export
notes the task that replaces it. Visual-only buttons (e.g. "New commitment") have no handlers.
Actions that would need an account (sign out, delete account) are shown disabled. The
interactive component demos (toasts, dialog, loading button) are on the development-only
`/dev/ui` page. **Consequences:** tasks 05–12 swap these imports for real data and delete
the module once it's unused.

## Open questions

Decide these before (or during) the task that needs them, then move each into the log above.

| #    | Question                                                                                                                                   | Needed by |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q-01 | **Android package ID.** `com.myc.app` is a placeholder; it becomes permanent with the first Play Store release. Which domain will MYC use? | 1.13      |
| Q-02 | **Production Supabase project.** Name, region (development is `ap-northeast-1`) and plan.                                                  | 1.15      |
| Q-03 | **Definition of a consistent day.** All expected commitments completed, or a threshold (PRD §17 says it may be configurable)?              | 1.07      |
| Q-04 | **Frequencies.** Only daily for the MVP, or specific weekdays / N-times-per-week? Affects "expected" actions and streaks.                  | 1.05      |
| Q-05 | **Deleting a commitment.** Archive only, or hard delete? What happens to its history (PRD §42)?                                            | 1.05      |
| Q-06 | **Timezone changes.** Does a change apply from the next local day onward, and how are travel days counted (PRD §34, §42)?                  | 1.11      |
| Q-07 | **Paused commitments.** Do paused days count as "not scheduled" for streaks?                                                               | 1.07      |
| Q-08 | **Web hosting.** Vercel is assumed for production env vars; confirm.                                                                       | 1.15      |
