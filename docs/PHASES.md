# Phases and tasks

The roadmap from foundation to the full product. Work happens one task at a time
([RULES.md §1](RULES.md#1-scope)); update the status here when a task finishes.

**Status key:** ✅ done · 🔄 in progress · ⏳ planned

Phases come from the PRD (§49). The Phase 1 task breakdown from 1.03 onward is a **proposed
order**: adjust it here as decisions are made, and keep each task's scope tight.

## Overview

| Phase | Goal                                                                                  | Status |
| ----- | ------------------------------------------------------------------------------------- | ------ |
| **1** | Web/PWA + Android app + Android widget on one Supabase backend (MVP)                  | 🔄     |
| 2     | iOS app + iOS widget                                                                  | ⏳     |
| 3     | macOS + Apple ecosystem integration                                                   | ⏳     |
| 4     | Ubuntu/Linux desktop integrations                                                     | ⏳     |
| 5     | AI consistency coach, smart reminders, advanced analytics, wearables, social, premium | ⏳     |

Yes. I’d divide **Phase 1 into small, independently testable tasks** so you can implement them one by one without mixing business logic.

# MYC Phase 1 — Task Breakdown

```text
PHASE 1
│
├── 01. Project Foundation          ✅
├── 02. Supabase Foundation         ✅
├── 03. Design System & App Shell   ✅
├── 04. Authentication              ✅
├── 05. User Profile & Onboarding   ✅
├── 06. First Commitment + "I COMMIT" ✅
├── 07. Commitment Management       ✅
├── 08. Daily Completion System
├── 09. Streak Engine
├── 10. MYC Calendar — Year
├── 11. MYC Calendar — Month/Week/Day
├── 12. Analytics Dashboard
├── 13. PWA
├── 14. Android App
├── 15. Android Widget
├── 16. Cross-Platform Sync
├── 17. Notifications
├── 18. Security & Edge Cases
└── 19. Phase 1 Testing & Release
```

---

## 01 — Project Foundation

Already your first task.

**Implement:**

- Next.js
- Expo
- TypeScript
- Tailwind
- shadcn/ui
- Monorepo
- Shared packages
- Supabase client foundation
- Environment configuration
- ESLint/Prettier
- Git setup
- PWA foundation

**Output:** Clean runnable project.

---

## 02 — Supabase Foundation

**Implement:**

- Supabase project connection
- Database configuration
- Migration structure
- RLS foundation
- Database types generation/setup
- Development/production environment separation

**Do NOT create every business table yet.**

**Output:** Web/mobile can securely communicate with Supabase.

---

## 03 — Design System & App Shell ✅

Create the actual MYC visual foundation.

_Done:_ tokens and components (see [ARCHITECTURE.md §4](ARCHITECTURE.md#4-web--appsweb)),
responsive shell, placeholder pages with static sample content from
`apps/web/src/lib/sample-data.ts` (D-18), dev-only gallery at `/dev/ui`.

**Implement:**

- Colors
- Typography
- Spacing
- Buttons
- Inputs
- Cards
- Dialogs
- Dropdowns
- Toasts
- Loading states
- Empty states
- Error states
- Responsive layout
- Navbar/sidebar
- Mobile navigation

**Output:**

```text
MYC
├── Dashboard
├── Calendar
├── Commitments
├── Analytics
└── Settings
```

No actual functionality yet.

---

# 04 — Authentication ✅

**Implement:**

- Sign up (email + password and Google OAuth)
- Login (email + password and Google OAuth)
- Logout (local scope sign-out with cache refresh)
- Email verification (cooldown, resend verification email)
- Forgot password (anti-enumeration recovery email)
- Reset password (secure recovery password update)
- Account linking (link Google to email account, set password on Google account without duplicate identities)
- Session persistence across reloads and multi-device sessions (Web SSR cookies & Mobile SecureStore)
- Protected routes and email verification gatekeeper via Next.js 16 `proxy.ts`
- Account & Security section in Settings (`apps/web/src/app/(app)/settings/_components/account-security-section.tsx`)
- Shared authentication utilities (`@myc/utils/auth`) with unit tests
- Mobile authentication manager (`apps/mobile/src/lib/auth.ts`) with deep link handling (`myc://auth/callback`)

**Output:**

```text
Register / Sign In (Email or Google)
   ↓
Email Verification Gate (if Email/Password)
   ↓
Authenticated MYC App (Web + Mobile)
   ↓
Account & Security Management (Link Google, Set/Change Password)
```

---

# 05 — User Profile & Onboarding ✅

Created:

### `profiles`

```text
id
user_id
timezone
myc_started_at
created_at
updated_at
```

_Done:_

- `profiles` table with owner-only RLS and `tr_protect_profile_fields` trigger enforcing immutability of `myc_started_at`, `user_id`, and `created_at`.
- Automatic profile creation on user signup via `handle_new_user` trigger on `auth.users`.
- Idempotent profile initialization RPC `ensure_profile(detected_timezone text)`.
- Client and server timezone detection with fallback to UTC.
- Profile Settings section in `apps/web/src/app/(app)/settings/_components/profile-settings-section.tsx` supporting timezone selection and journey status display.
- Complete 4-step onboarding flow at `apps/web/src/app/(app)/onboarding/page.tsx`: Welcome & Philosophy, Consistency Rules, Define First Commitment, and Review & "I COMMIT".

Important:

```text
account_created_at
        ≠
myc_started_at
```

`myc_started_at` remains `NULL` until the first commitment is created and committed via "I COMMIT".

---

# 06 — First Commitment + "I COMMIT" ✅

This is a **critical MYC feature**.

Flow:

```text
Create First Commitment
        ↓
Review
        ↓
"I COMMIT"
        ↓
myc_started_at = today (user local date)
        ↓
MYC officially begins
```

_Done:_

- Commitment creation UI supporting title, description, frequency (daily or specific days), tone color, and start date.
- Commitment preview screen displaying summary, frequency badges, and official start date.
- Dedicated "I COMMIT" confirmation action.
- Atomic PostgreSQL transaction via RPC `confirm_first_commitment(commitment_id uuid, client_local_date date)` setting `myc_started_at` and activating the commitment in one atomic operation with row locking (`FOR UPDATE`).
- Database trigger `tr_check_commitment_rules` preventing commitments from activating while `myc_started_at` is `NULL` outside this transaction.
- Celebration state transitioning user seamlessly to their active dashboard/commitments view.

**Output:** User officially starts their MYC journey.

---

# 07 — Commitment Management ✅

The complete commitment system.

### `commitments`

```text
id
user_id
title
description
frequency (daily | specific_days)
schedule_days (integer array [1..7])
start_date (date)
end_date (date, nullable)
status (draft | active | paused | archived)
tone (sky | emerald | amber | rose | indigo)
created_at
updated_at
```

_Done:_

- Commitments page (`apps/web/src/app/(app)/commitments/page.tsx`) with server-side streaming under `<Suspense>`.
- Client view (`apps/web/src/app/(app)/commitments/_components/commitments-view.tsx`) with Active, Paused, and Archived filter tabs.
- Full CRUD modals: `CommitmentDialog` for creating/editing and `DeleteCommitmentDialog` for permanent deletion.
- Lifecycle controls: Pause, Resume, Archive, Edit, and Delete with responsive action menus.
- Empty states tailored for first-time journey starters ("Define your first commitment") and empty status tabs.
- Mobile display in `apps/mobile/src/App.tsx` showing active commitments and profile metadata.
- Shared domain types in `@myc/types/domain` and validation utilities in `@myc/utils/commitments` with 100% test coverage.

---

# 08 — Daily Completion System

Now make MYC actually track consistency.

Implement:

```text
Today's Commitments

☑ DSA
☑ Project
☐ Blog
☑ Workout

3 / 4
75%
```

Create:

### `daily_completions`

```text
id
user_id
commitment_id
date
status
completed_at
created_at
```

Handle:

- Complete
- Uncomplete
- Duplicate requests
- Future dates
- Inactive commitments
- Timezone

---

# 09 — Streak Engine

Build the consistency calculation engine.

Implement:

- Current streak
- Best streak
- Consistent days
- Daily consistency %
- Overall consistency %

Keep this logic centralized.

For example:

```text
lib/
└── consistency/
    ├── streak.ts
    ├── daily-score.ts
    └── analytics.ts
```

Don't duplicate streak calculations across pages.

---

# 10 — MYC Calendar — Year View

Now build the **main MYC calendar**.

Requirements:

- Starts from `myc_started_at`
- Contribution-style visualization
- Current date highlighted
- Future dates disabled/empty
- Consistency intensity
- Hover/click details
- Year navigation

Example:

```text
MYC — 2026

Oct

▣ ▣ ▢ ▣ ▣ ▣ ▣
▣ ▣ ▣ ▢ ▣ ▣ ▣
```

---

# 11 — Calendar — Month / Week / Day

Build deeper calendar views.

### Month

Daily details.

### Week

Short-term consistency.

### Day

Commitment-level details.

```text
Year
 ↓
Month
 ↓
Week
 ↓
Day
 ↓
Commitments
```

Also implement:

### Filter

```text
All
DSA
Project
Workout
Reading
```

---

# 12 — Analytics Dashboard

Now build the dashboard around real data.

Implement:

### Cards

```text
🔥 Current Streak
🏆 Best Streak
📅 Consistent Days
📊 Overall Consistency
```

### Charts

- Weekly consistency
- Monthly consistency
- Commitment performance

Don't overdo charts initially.

---

# 13 — PWA

Now make the Web app installable.

Implement:

- Manifest
- Icons
- Splash/loading behavior
- Standalone mode
- Service worker
- Cache strategy
- Offline app shell
- Install prompt
- Update handling

Test:

```text
Windows
macOS
Ubuntu
Android Browser
```

---

# 14 — Android App

Now create the mobile client.

Using:

**Expo + React Native**

Implement:

- Auth
- Session persistence
- Dashboard
- Today's commitments
- Completion
- Calendar
- Profile/settings

Important:

**Do NOT create separate business logic.**

Android uses the same MYC backend.

---

# 15 — Android Home Screen Widget ⭐

This is one of the most important Phase-1 tasks.

Widget should show:

```text
┌──────────────────┐
│ MYC              │
│                  │
│ TODAY            │
│                  │
│ ☑ DSA            │
│ ☑ Project        │
│ ☐ Blog           │
│                  │
│ 2 / 3            │
│ 🔥 14 days       │
└──────────────────┘
```

Implement:

- Widget authentication strategy
- Today's data
- Completion count
- Streak
- Widget refresh
- Widget → App deep link
- Multiple widget sizes if feasible

Then optionally:

**Direct completion from widget.**

---

# 16 — Cross-Platform Sync

Test this properly.

Example:

```text
Web
 ↓
Complete DSA
 ↓
Supabase
 ↓
Android
 ↓
Widget updates
```

And:

```text
Android Widget
 ↓
Complete DSA
 ↓
Supabase
 ↓
Web updates
```

This is where MYC starts feeling like a real ecosystem.

---

# 17 — Notifications

Optional for early MVP, but good Phase-1 addition.

Implement:

- Daily reminder
- Incomplete commitments reminder
- Streak reminder

Avoid aggressive/guilt-based messaging.

---

# 18 — Security + Edge Cases

Before release:

### Security

- RLS
- Auth validation
- Authorization
- Input validation
- Rate limiting where necessary
- No exposed service-role key
- Secure widget authentication

### Edge cases

Test:

- First commitment
- No commitments
- Deleted commitment
- Paused commitment
- Missed day
- Timezone change
- Login on multiple devices
- Duplicate completion
- Offline state
- Future date
- Session expiration

---

# 19 — Phase 1 Testing & Release

Final testing:

### Web

```text
Chrome
Edge
Safari
Firefox
```

### PWA

```text
Windows
macOS
Ubuntu
Android
```

### Android

```text
Real Android device
```

### Widget

```text
Add
Remove
Resize
Refresh
Login/logout
Data synchronization
```

Then:

```text
Production Supabase
       +
Production Web/PWA
       +
Android APK
```

---

# Recommended Implementation Order

Don't jump around.

```text
01 Foundation
      ↓
02 Supabase
      ↓
03 Design System
      ↓
04 Auth
      ↓
05 Profile/Onboarding
      ↓
06 I COMMIT
      ↓
07 Commitments
      ↓
08 Daily Completion
      ↓
09 Streak Engine
      ↓
10 Year Calendar
      ↓
11 Month/Week/Day
      ↓
12 Analytics
      ↓
13 PWA
      ↓
14 Android
      ↓
15 Android Widget ⭐
      ↓
16 Sync
      ↓
17 Notifications
      ↓
18 Security/Edge Cases
      ↓
19 Release
```

### Most important rule

**Each task should be completed and tested before starting the next one.**

And when we write implementation prompts, each prompt should say:

> **Modify the existing MYC codebase. Do not rewrite or break existing functionality. Preserve all existing architecture and conventions.**

That will prevent the AI/dev workflow from destroying previous work.
