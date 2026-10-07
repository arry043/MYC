# Development rules

Rules for everyone changing MYC, human or AI agent. They exist to keep MYC secure, consistent
across clients, and buildable one phase at a time. If a rule blocks you, raise it and record the
outcome in [DECISIONS.md](DECISIONS.md) rather than working around it.

## 1. Scope

- **Work on one task at a time**, as defined in [PHASES.md](PHASES.md). Don't implement anything
  belonging to a later task, even partially.
- **No fake features.** No demo data, sample tables, placeholder screens pretending to work, or
  example code from tutorials (e.g. `todos`).
- **The PRD is the source of truth for behaviour.** When it is ambiguous (see open questions in
  [DECISIONS.md](DECISIONS.md)), ask before choosing.
- **Don't over-engineer.** Build what the current task needs, in a way that doesn't block the
  next ones.

## 2. Architecture

- Business rules live in **Supabase** (constraints, RLS, SQL functions, Edge Functions), not in
  clients. A rule enforced only in a client isn't enforced.
- Metrics (consistent day, streaks, consistency %) have **one implementation**, in the database.
  Clients must not recompute them.
- No client or widget keeps its own source of truth. Local caches are caches.
- Shared code goes in `packages/*`; app-specific code stays in its app. Packages never import
  from apps.
- `packages/utils` must stay platform-agnostic: no `next/*`, `react-native`, or DOM-only APIs.

## 3. Database

- **Every schema change is a migration** (`npm run db:migration:new -- <name>`). Never change
  the schema, policies, functions or triggers in the Supabase dashboard.
- **Never edit a migration once it has been applied** to any shared project. Fix forward.
- **RLS on every table** in `public`. User-owned tables use the owner-only template in
  [supabase/README.md](../supabase/README.md). Never `using (true)` on user data; never disable
  RLS for convenience.
- **Add a pgTAP test** for each new table proving User A can't read or change User B's rows.
- **Regenerate and commit types** after every migration: `npm run db:types`.
- **Dates are user-local.** Store calendar dates as `date` in the user's timezone (from
  `profiles.timezone`). Never derive "today" from server UTC for user-facing logic (PRD §34).
- **Protect history.** Missing a day, pausing or archiving a commitment never deletes
  completion records (PRD §42, §46).
- **`myc_started_at`** is set only by the first "I COMMIT", never by sign-up, and never reset
  (PRD §12). Enforce this in the database.
- Integrity rules (no future-date completions, one completion per commitment per day) are
  database constraints or functions, not just UI checks.
- Production only receives migrations that already passed in development
  (`db:push:dry` first, always).

## 4. Security

- Clients use only the **publishable / anon key**. The **service-role / secret key** is never
  used in `apps/*` (ESLint fails if it is). Privileged work goes in Edge Functions.
- Never commit secrets. Only `.env.example` files are tracked; real values live in git-ignored
  `.env.local` files (development) or the deployment platform (production).
- Never log secrets, keys, JWTs, sessions or other users' data.
- Web server-only modules start with `import "server-only"`.
- Read environment variables only through each app's `src/lib/env.ts`; fail clearly when one is
  missing. No fallback or hard-coded credentials.
- Never trust client input for authorization; RLS and database constraints decide.
- Least privilege: grant the minimum to `anon` / `authenticated`, and revoke `EXECUTE` on
  internal functions.

## 5. Code

- **TypeScript strict** everywhere. No `any`, no non-null `!` to silence missing values, no
  `@ts-ignore`. If a suppression is unavoidable, add a comment saying why.
- **Imports** follow the lint-enforced order: packages → `@myc/*` → `@/*` → relative.
- **Path aliases:** `@/*` for app-local code, `@myc/*` for shared packages. No deep relative
  paths across folders.
- **Supabase clients** are created only via `apps/web/src/lib/supabase/{client,server}.ts` and
  `apps/mobile/src/lib/supabase.ts`.
- **Database types** come from `@myc/types`; never hand-write row types that duplicate the
  schema.
- No dead code, commented-out code, or debugging `console.log` left in commits.
  Development-only diagnostics must be excluded from production (see the existing dev checks).
- Comments explain _why_, not _what_.
- Formatting is Prettier's job: run `npm run format`.

### Web

- Next.js 16 differs from older versions. Read the bundled docs in
  `node_modules/next/dist/docs/` before using an API (see `apps/web/AGENTS.md`).
- Server Components by default; add `"use client"` only where interactivity requires it.
- UI primitives come from shadcn/ui (`npx shadcn@latest add <component>` in `apps/web`) and
  the theme tokens in `globals.css`. Don't hard-code colours.
- Use `proxy.ts`, not `middleware.ts` (renamed in Next 16).

### Mobile

- Expo changes every SDK. Check the versioned docs for SDK 57 before using an API (see
  `apps/mobile/AGENTS.md`).
- Add dependencies with `npx expo install <pkg>` (in `apps/mobile`) so versions match the SDK.
- Never create or edit `android/` or `ios/` by hand; configure native behaviour in `app.json`
  and config plugins.
- Navigation will use Expo Router once it's introduced; until then don't add another router.

## 6. Dependencies

- Add a dependency only when it's required, and prefer official packages (Supabase, Expo,
  Next.js). Check whether something already installed covers the need.
- Keep **one React version** across the monorepo; React Native requires the exact version Expo
  pins. Upgrade React only together with Expo.
- Use npm only (no pnpm, yarn or bun lockfiles).

## 7. UX and copy (PRD §43)

- Calm, premium, focused, non-judgmental, data-driven.
- No shame or guilt copy, aggressive red warnings, notification spam, or excessive
  gamification. A missed day is neutral: "Miss once. Come back tomorrow."
- Every error state offers a clear recovery action (PRD §41).
- Works on desktop, tablet and phone widths.

## 8. Git

- Work on a branch per task; keep commits focused, with messages that say why.
- Commit generated files that the build depends on (`packages/types/src/database.ts`,
  `package-lock.json`); never commit `.env*` (except examples), build output or `android/` /
  `ios/`.
- Never rewrite history on shared branches.

## 9. Definition of done

A task is done when all of these hold:

- [ ] Scope matches the task in [PHASES.md](PHASES.md): nothing missing, nothing from later tasks.
- [ ] `npm run check` passes (format, lint, typecheck).
- [ ] `npm run build:web` passes.
- [ ] `npm run db:test` and `npm run db:types:check` pass (when the schema changed, new
      migrations are applied to development and types are regenerated).
- [ ] `npx expo-doctor` passes in `apps/mobile` (when mobile changed).
- [ ] The change was exercised for real (web in a browser, mobile on a device or emulator), not
      only compiled.
- [ ] No secrets in the diff.
- [ ] Docs updated: task status in [PHASES.md](PHASES.md); [ARCHITECTURE.md](ARCHITECTURE.md)
      if structure changed; [DECISIONS.md](DECISIONS.md) for any new decision.
