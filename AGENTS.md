# MYC — guide for AI coding agents

MYC (Make Yourself Consistent) is a consistency platform: a Next.js PWA and an Expo Android app
(plus, later, an Android widget) on one Supabase backend.

## Before you change anything

1. Find the current task in [docs/PHASES.md](docs/PHASES.md). Implement **only** that task.
2. Follow [docs/RULES.md](docs/RULES.md). They are not optional.
3. Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for where code belongs, and
   [docs/DECISIONS.md](docs/DECISIONS.md) before reversing an earlier choice. If an open
   question there affects your task, ask instead of guessing.
4. The product source of truth is [docs/PRD.md](docs/PRD.md).

## Non-negotiables

- Schema changes only through migrations in `supabase/migrations/`; RLS with owner-only policies
  and a pgTAP test for every user-owned table; regenerate types with `npm run db:types`.
- Business rules and metrics live in the database, not in clients.
- Never use the Supabase service-role / secret key in `apps/*`; never commit or log secrets.
- No fake features, demo data or work from later tasks.
- Next.js 16 and Expo SDK 57 differ from older versions: read `apps/web/AGENTS.md` and
  `apps/mobile/AGENTS.md` and the docs they point to before using framework APIs.
- Mobile dependencies: `npx expo install` in `apps/mobile`. Keep one React version.

## Commands

```bash
npm run dev:web | dev:mobile | android     # run the apps
npm run check                              # format + lint + typecheck (must pass)
npm run build:web                          # must pass
npm run db:migration:new -- <name>         # new migration
npm run db:push:dry && npm run db:push     # apply to the development project
npm run db:test                            # database tests (needs Docker)
npm run db:types                           # regenerate shared database types
```

Finish by checking the definition of done in [docs/RULES.md §9](docs/RULES.md#9-definition-of-done),
including updating the docs.
