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

### D-19 · Supabase Auth with Email/Password + Google OAuth and Account Linking — 2026-10-16

Task 04 requires production authentication with exactly Email/Password and Google OAuth, linkable
to a single MYC identity without account duplication. **Decision:** use Supabase Auth with
manual identity linking (`supabase.auth.linkIdentity`). Never merge accounts automatically on
matching email alone to prevent account hijacking. Collisions require secure authentication to the
existing account prior to linking. Google OAuth uses provider-verified email claims. Email/password
accounts require email verification before accessing protected routes. Password setup/update is
handled via `supabase.auth.updateUser`. **Consequences:** `supabase/config.toml` enables
`enable_manual_linking = true`; `AccountSecuritySection` in Settings manages linking, unlinking, and
password establishment.

### D-20 · Next.js 16 Proxy for Session Interception and Route Guarding — 2026-10-16

Next.js 16 replaces `middleware.ts` with `proxy.ts`. **Decision:** implement `src/proxy.ts` using
`@supabase/ssr` `createServerClient` with `request.cookies.getAll()` and response cookie mirroring.
Session verification uses `supabase.auth.getUser()` (never unverified `getSession()`). Protects
`/dashboard`, `/calendar`, `/commitments`, `/analytics`, `/settings`, routing unauthenticated users
to `/login` with sanitized `next` parameters, and unverified email users to `/verify-email`.
**Consequences:** robust multi-device cookie persistence and route protection without client-side
flashes.

### D-21 · Mobile Deep Linking and AppState Token Refreshing — 2026-10-16

Expo mobile authentication requires OAuth redirects and background-to-foreground session checks.
**Decision:** configure `myc://auth/callback` deep link scheme and register URL event listeners
via `expo-linking`. In `apps/mobile/src/lib/auth.ts`, hook into React Native `AppState` to
automatically invoke `supabase.auth.startAutoRefresh()` when active and `stopAutoRefresh()` when
in background. **Consequences:** reliable OAuth flow via system browser and clean token persistence
via `expo-sqlite` localStorage adapter.

### D-22 · Database-Enforced Profile Invariants & Timezone Persistence — 2026-10-17

Tasks 05–06 mandate that account creation date is never the MYC journey start date, and `myc_started_at`
must remain `NULL` until the user confirms "I COMMIT". **Decision:** enforce this invariant in the
database with trigger `tr_protect_profile_fields`. Direct updates to `myc_started_at`, `user_id`, or
`created_at` from client RLS are rejected. Only the trusted internal confirmation RPC setting session
config `myc.internal_confirmation = 'true'` may set `myc_started_at`. Once set, `myc_started_at` is
permanently immutable. Profiles are created automatically on user signup via `auth.users` trigger and
retrieved idempotently via `ensure_profile(detected_timezone text)`. **Consequences:** client-side bugs
or direct API calls cannot prematurely start or rewrite a user's journey.

### D-23 · Atomic "I COMMIT" Confirmation Transaction via RPC — 2026-10-17

Task 06 requires the first commitment review and "I COMMIT" confirmation to atomically activate the
commitment and record the official start date. **Decision:** implement `confirm_first_commitment(commitment_id uuid, client_local_date date)`
as a `SECURITY DEFINER` PostgreSQL function. In a single transaction with row-level locking (`FOR UPDATE`),
it validates the commitment belongs to the calling user, sets `profiles.myc_started_at` to the user's
local calendar date (if not already set), sets commitment `status = 'active'`, and records `start_date`.
Trigger `tr_check_commitment_rules` prevents any commitment from being marked active while `myc_started_at`
is `NULL` unless performed inside this transaction. **Consequences:** zero race conditions, guaranteed
atomicity, and no orphan active commitments without an official start date.

### D-24 · Commitment Lifecycle, Frequencies, and Deletion Model — 2026-10-17

Task 07 establishes commitment management. **Decision:**

- Frequencies: supports `daily` and `specific_days` (array of integers `[1..7]` where 1 = Monday per ISO-8601).
- Lifecycle: statuses are `draft`, `active`, `paused`, and `archived`.
- Deletion (resolving Q-05): supports both soft-archival (`status = 'archived'`) for history preservation and
  hard deletion with confirmation modal for unwanted commitments.

### D-25 · Daily Completions Table & Database Integrity Rules — 2026-10-17

Task 08 establishes daily completion tracking. **Decision:**

- Table: `daily_completions` (`id`, `user_id`, `commitment_id`, `date`, `status`, `completed_at`, `created_at`).
- Unique constraint: `UNIQUE (user_id, commitment_id, date)` guarantees duplicate-request idempotency.
- Database Trigger: `tr_check_daily_completion_rules` enforces backend-level integrity:
  1. Profile journey rule: completions rejected before `myc_started_at`.
  2. Future-date protection: evaluated against the user's specific IANA timezone (`now() AT TIME ZONE profile.timezone`).
  3. Status & validity: commitment must be `active`, owned by the caller, within date range (`start_date <= date <= end_date`), and scheduled for that day's ISO weekday if `specific_days`.
- Idempotent RPCs: `complete_commitment(p_commitment_id, p_date)` and `uncomplete_commitment(p_commitment_id, p_date)` provide atomic, safe toggle operations.
- RLS: Owner-only policies for `SELECT`, `INSERT`, `DELETE`.
  **Consequences:** guarantees zero fake data, no future completions, and rock-solid database integrity. Resolves Q-07 (paused days are not expected and cannot be completed).

### D-26 · Centralized Consistency Engine & Metric Calculation Rules — 2026-10-17

Task 09 implements pure, centralized calculations in `@myc/utils/consistency.ts` shared across Web and Mobile:

- Consistent Day (resolving Q-03): A calendar date where expected commitments > 0 and all expected commitments were completed (`completed == expected`).
- Daily Consistency %: `(completed / expected) * 100`. Returns `null` when expected == 0 (unscheduled day).
- Current Streak: Counts consecutive consistent days up to today. If today is incomplete or has not had all tasks completed yet, the streak persists based on yesterday's completion status. Unscheduled days (0 expected) neither break nor extend the streak. An uncompleted expected past day breaks the streak.
- Best Streak: The maximum consecutive run of consistent days across the user's journey since `myc_started_at`.
- Overall Consistency %: Weighted percentage: `(total completed instances) / (total expected instances) * 100` across all days from `myc_started_at` to today.
- "Not Started" State: Returns zeroed metrics when `myc_started_at` is `null`.
  **Consequences:** single source of truth across all platforms with 100% test coverage covering all 18 streak edge cases.

### D-27 · Calendar Multi-View Hierarchy, Date Bounds, and Intensity Scale — 2026-10-17

Tasks 10 & 11 establish the unified Calendar system (`apps/web/src/app/(app)/calendar/`):

- 4 Views: Year (12-month contribution grid), Month (conventional calendar grid with weekday alignment), Week (7-day card layout with checklist preview), and Day (single-day detail with progress ring, checklist, and live complete/uncomplete toggle).
- Journey Bounds: Calendar strictly starts at `profiles.myc_started_at` (never January 1 or account creation date). Pre-journey days are marked as pre-journey and excluded from metrics. Future dates (based on user's IANA timezone) are disabled and cannot be completed in advance. If `myc_started_at` is `null`, an honest "Journey not started yet" empty state is displayed with a direct CTA to create the first commitment.
- 5-Level Intensity Scale:
  - Level 0: Unscheduled (0 expected commitments).
  - Level 1: 0% completion (expected > 0, 0 kept).
  - Level 2: 1–50% completion.
  - Level 3: 51–99% completion.
  - Level 4: 100% consistent (all expected kept).
- Commitment Filtering: Users can filter the calendar to "All commitments" or any individual commitment, dynamically recalculating expected/completed counts and intensity levels via `calculateFilteredDailySummary`.
- Timezone Changes (resolving Q-06): Evaluated dynamically against `profiles.timezone`. Stored completion dates are permanent historical dates; timezone updates change the user's current today boundary and future scheduling without retroactively shifting completed calendar days.

### D-28 · Analytics Dashboard, Reporting Periods, and Zero-Mock Architecture — 2026-10-17

Task 12 establishes the Analytics system (`apps/web/src/app/(app)/analytics/`):

- Reporting Periods: Supports Last 7 Days (`7d`), Last 30 Days (`30d`), This Year (`year`), and All Time (`all`).
- Metric Integrity: Absolutely zero mock data or hardcoded stats. Metric cards (Current Streak, Best Streak, Consistent Days, Overall Consistency %), Weekly Consistency Bar Chart, Monthly Consistency Bar Chart, and Commitment Performance Breakdown are computed directly from database records via pure engine utilities in `@myc/utils`.
- Accessible Visualizations: Custom semantic HTML/SVG bar charts with percentage labels, ARIA attributes, and clear diagonal hatch styling for unscheduled days.

### D-29 · Permanent Completions, Activity Comments, and Realtime Multi-Device Sync — 2026-10-17

TASK Fix establishes permanent completion immutability, activity notes, and fixes calendar navigation:

- **Permanent Completion Immutability:** Once recorded, a commitment completion for a date cannot be undone, unchecked, edited, or deleted through any UI, API, or direct SQL operation.
  - Database enforcement: Dropped `DELETE` RLS policy on `daily_completions`. Statement-level trigger `tr_protect_daily_completion_immutability` explicitly raises an exception on any authenticated/anon `UPDATE` or `DELETE` attempt. The `uncomplete_commitment` RPC is replaced to throw an exception and execute permission is revoked from `authenticated`.
  - Client enforcement: Removed uncomplete/undo interactions in Web (`TodayList`, `CommitmentsView`, `DayCalendar`) and Mobile (`App.tsx`). Completed items render permanent "Done" badges.
- **Confirmation Flow with Activity Comments:**
  - Clicking an incomplete commitment opens `CompleteCommitmentDialog`.
  - Heading: "Complete commitment?", commitment name, selected date.
  - Optional activity note: max 1,000 characters, client and DB check (`comment is null or length(comment) <= 1000`). Trims whitespace and stores empty text as `NULL`.
  - Prominent calm reminder: "Once submitted, this completion and its comment cannot be changed or undone."
- **Activity History Experience:**
  - Accessible `CommitmentHistoryDialog` and Day View activity list rendering completed sessions in chronological order with exact timestamps formatted in the user's IANA timezone (`formatCompletionTimestamp` / `formatCompletionTimeOnly`) and italic comment quotes.
  - Indexes `(user_id, completed_at DESC)` and `(user_id, commitment_id, completed_at DESC)` support performant history queries.
- **Calendar Navigation Bug Fix:**
  - Resolved root cause where Day View queried a single day and navigating via prev/next arrows changed the client date state while `days` retained the previous day's data.
  - Solution: Keyed `<CalendarView key={`${data.view}-${data.selectedDate}-${data.filterCommitmentId}`} />` in server component to cleanly remount with fresh server-rendered data, hooked into `useTransition` with pending indicators, and disabled rapid clicking while navigation is in flight.
- **Realtime Multi-Device Sync:**
  - Supabase Realtime channel subscription on `public.daily_completions` in `CalendarView`, `DashboardView`, and `CommitmentsView` calling `router.refresh()` to propagate changes across devices and tabs without duplicate listeners or manual browser refreshes.

### D-30 · Production-Ready Progressive Web App (PWA) Implementation — 2026-10-18

Phase 13 establishes the installable Progressive Web App architecture:

- **Vanilla Service Worker over Webpack Plugins:** Next.js 16 uses Turbopack by default. Third-party Next.js PWA plugins (`next-pwa`, `@ducanh2912/next-pwa`) monkey-patch webpack compiler hooks and break Turbopack builds. A pure vanilla Service Worker in `apps/web/public/sw.js` with TypeScript utilities in `packages/utils/src/pwa.ts` and React registration hooks provides zero build friction, fast startup, and complete control over caching scopes.
- **Strict Network-Only Isolation for Authenticated / Sensitive Data:**
  - Cache Storage NEVER caches Supabase API responses (`*.supabase.co`, `/rest/v1/*`, `/auth/v1/*`), mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`), authenticated profile data, user commitment records, or completions.
  - Caching sensitive user data in Cache Storage risks exposing private records or stale streak calculations across user logout or device sharing.
- **Offline Integrity Protection:**
  - When navigation requests fail offline, the Service Worker serves a dedicated pre-cached `/offline` shell.
  - The offline shell does not offer simulated completion buttons, fake offline queues, or fabricated streaks. It transparently explains that consistency records require a live connection to preserve permanent immutability, with an interactive "Try again" reload button.
- **Controlled App Update Lifecycle:**
  - Service worker checks for byte updates on navigation. When a new worker is discovered, the client UI displays an unobtrusive `UpdateNotice` toast ("A new version of MYC is available") rather than forcing an unannounced page reload that could discard active user inputs.
  - Clicking "Update now" sends a `SKIP_WAITING` message to the waiting worker. A duplicate reload guard (`hasReloadedForUpdate`) prevents reload loops when `controllerchange` fires.
- **Concurrent-Safe Installation & Display Mode Detection:**
  - Installed/standalone detection uses `useSyncExternalStore` bound to `(display-mode: standalone)` and `window.navigator.standalone`. This avoids synchronous `setState` in effects, eliminating cascading renders and hydration mismatches.
  - The Settings page provides clear status feedback across all platforms: native "Install App" prompt on Chromium/Android, step-by-step instructions for iOS Safari ("Add to Home Screen"), and "App Installed" status when running in standalone mode.
- **Smart, Non-Intrusive Install App Popup (`InstallAppPopup`):**
  - **Non-blocking presentation:** Positioned as a floating popover/card (`sm:bottom-6 sm:right-6 max-w-sm` on desktop, `bottom-20 left-4 right-4` on mobile safely above the bottom navigation). Designed with locked MYC tokens, soft cyan-blue accents, and `BrandMark`.
  - **Smart Delay (10s):** Waits 10 seconds (`INSTALL_DELAY_MS`) after initial mount before evaluating eligibility, ensuring initial authentication and page loading are complete.
  - **App-Level Single Controller:** Controlled in root `PwaProvider` across the entire session; route transitions (`usePathname()`) do not restart the timer or cause duplicate popups.
  - **Route Suppression:** Automatically suppressed on critical paths (`/onboarding`, `/offline`, `/verify-email`, `/reset-password`) to prevent interrupting first-commitment creation or sensitive auth flows.
  - **Dismissal & 7-Day Cooldown:** Dismissing via "Maybe Later" or the close button sets an in-memory session dismissal flag and a 7-day cooldown (`INSTALL_COOLDOWN_DAYS = 7`) in `localStorage` (`myc_pwa_install_dismissed_until`). Storage access is protected with `try/catch` to fail gracefully in private browsing or disabled storage.
  - **Platform-Aware Actions:** Triggers native install on Chromium/Android, provides inline Safari "Share → Add to Home Screen" instructions on iOS, and suppresses automatic popups on unsupported desktop browsers to avoid nonfunctional buttons.
  - **Permanent Suppression upon Installation:** When running in standalone mode or once installation succeeds, the popup is permanently suppressed.

### D-31 · Native Android App Implementation with Expo, React Native, and Web/PWA UI Parity — 2026-10-19

Phase 14 delivers the native Android client in `apps/mobile`:

- **Single Source of Truth & Zero Duplicate Business Logic:**
  - Database schema, RLS policies, and RPCs (`complete_commitment`, `confirm_first_commitment`, `ensure_profile`) remain the authoritative backend.
  - Streaks, scores, consistency percentages, and date logic are computed strictly by `@myc/utils/src/consistency.ts`.
  - Completions are permanently immutable across clients: completion cards do not allow unchecking or undoing, matching D-29.
- **Secure Persistence via `expo-secure-store`:**
  - Custom `ExpoSecureStoreAdapter` provides an asynchronous `getItem`, `setItem`, and `removeItem` interface directly mapping to Android Keystore / EncryptedSharedPreferences.
  - Replaces volatile or unencrypted browser storage on Android for high security.
- **Design Tokens & Geometry Parity with Mobile Web:**
  - Token parity: warm off-white canvas (`#F8F7F4`), pure card surface (`#FFFFFF`), borders (`#E5E3DD`), text tokens, and pastel accent tones (`sky`, `lavender`, `peach`, `mint`, `sun`) matching `apps/web/src/app/globals.css`.
  - Curved mobile navigation geometry: `AppHeader` features `rounded-b-[1.75rem]` (28px) and `BottomNav` features `rounded-t-[1.75rem]` (28px) with subtle elevation, matching the mobile web design.
  - Header UserMenu dropdown: compact avatar modal with Profile, Settings, and Logout in exact order.
  - Dedicated Profile page separated from Settings, matching Web route `/profile`.
- **Default Calendar View:**
  - Automatically loads in **Day view** for the user's current date, addressing the usability requirement for fast daily completion verification while supporting Day/Week/Month/Year view switching.
- **Realtime Synchronization:**
  - Subscribes to Supabase Realtime Postgres change events on `daily_completions` and `commitments`, ensuring immediate synchronization when actions happen on Web or another device.

## Open questions

Decide these before (or during) the task that needs them, then move each into the log above.

| #    | Question                                                                                                                                   | Needed by |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q-01 | **Android package ID.** `com.myc.app` is a placeholder; it becomes permanent with the first Play Store release. Which domain will MYC use? | 1.13      |
| Q-02 | **Production Supabase project.** Name, region (development is `ap-northeast-1`) and plan.                                                  | 1.15      |
| Q-08 | **Web hosting.** Vercel is assumed for production env vars; confirm.                                                                       | 1.15      |
