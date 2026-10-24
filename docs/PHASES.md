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
├── 08. Daily Completion System     ✅
├── 09. Streak Engine               ✅
├── 10. MYC Calendar — Year         ✅
├── 11. MYC Calendar — Month/Week/Day ✅
├── 12. Analytics Dashboard         ✅
├── Fix. Immutable Completions, Notes & Realtime ✅
├── 13. PWA                     ✅
├── 14. Android App                 ✅
├── Single Day Commitment           ✅
├── 15. Android Widget              ✅
├── 16. Cross-Platform Sync         ✅
├── 17. Notifications               ✅
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
- Profile section at `apps/web/src/app/(app)/profile/page.tsx` (`ProfileDetailsSection`) supporting timezone selection and journey status display.
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

# 08 — Daily Completion System ✅

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

_Done:_

- Migration `20261016185928_daily_completions.sql` applied to development database.
- Unique constraint `UNIQUE (user_id, commitment_id, date)` preventing duplicate completions.
- Owner-only RLS policies for `SELECT`, `INSERT`, `DELETE`.
- Trigger `tr_check_daily_completion_rules`:
  - Blocks completions prior to user's `myc_started_at`.
  - Blocks future dates based on profile IANA timezone (`now() AT TIME ZONE profile.timezone`).
  - Verifies commitment is active, owned by caller, within valid date range, and scheduled for the date's ISO weekday if `specific_days`.
- RPCs: `complete_commitment(p_commitment_id, p_date)` and `uncomplete_commitment(p_commitment_id, p_date)` for atomic, idempotent toggling.
- 14 pgTAP database tests in `supabase/tests/database/daily_completions.test.sql` verifying all constraints, future date rejections, RLS isolation, and RPC operations.
- Interactive Today's Commitments UI on Dashboard (`apps/web/src/app/(app)/dashboard/_components/today-list.tsx`) and Commitments page with optimistic updates and rollback on error.
- Mobile toggle completion support in `apps/mobile/src/App.tsx`.

---

# 09 — Streak Engine ✅

Build the consistency calculation engine.

Implement:

- Current streak
- Best streak
- Consistent days
- Daily consistency %
- Overall consistency %

Keep this logic centralized.

_Done:_

- Centralized consistency engine in `packages/utils/src/consistency.ts` re-exported at `@myc/utils`:
  - `getUserLocalDateString`, `getIsoWeekday`, `addDays`, `getDateRange`, `isDateInFuture`, `isValidTimezone`.
  - `isCommitmentExpectedOnDate`, `getExpectedCommitmentsForDate`: pure scheduling evaluation.
  - `calculateDailySummary`: daily score calculation (`completed / expected * 100`, `null` if unscheduled).
  - `calculateCurrentStreak` & `calculateBestStreak`: pure streak calculations supporting continuing streaks from yesterday, neutral unscheduled days (0 expected), and edge cases.
  - `calculateConsistencyMetrics`: consistent days count and overall weighted percentage (`total_completed / total_expected * 100`).
  - `getDashboardConsistencyData`: unified server-side fetcher querying Supabase and producing comprehensive dashboard data.
- 15 unit tests in `packages/utils/src/consistency.test.ts` covering all 18 specified streak cases, math formulas, and date helpers.
- Dashboard integration (`apps/web/src/app/(app)/dashboard/page.tsx` & `dashboard-view.tsx`) displaying real streaks, consistent days, daily progress ring, linear bar, 7-day trend chart, and journey duration.
- Clean empty / not-started states when `myc_started_at` is `null`.

---

# 10 — MYC Calendar — Year View ✅

Build the **main MYC calendar**.

Requirements:

- Starts from `myc_started_at`
- Contribution-style visualization
- Current date highlighted
- Future dates disabled/empty
- Consistency intensity
- Hover/click details
- Year navigation

_Done:_

- Contribution-style Year Calendar in `apps/web/src/app/(app)/calendar/_components/year-calendar.tsx`:
  - 12-month responsive grid with weekday labels (`M`, `W`, `F`).
  - Pre-journey dates (before `profiles.myc_started_at`) visually muted as pre-journey.
  - Future dates (beyond today in user's timezone) disabled and empty.
  - Current date highlighted with an active focus ring.
  - 5-level intensity scale (0 = unscheduled, 1 = 0%, 2 = 1–50%, 3 = 51–99%, 4 = 100% consistent).
  - Hover and click details with popover showing date, percentage, completed/expected counts, and status.
  - Accessible Intensity Legend component (`_components/calendar-legend.tsx`).
  - Year navigation toolbar with bounds checking against `myc_started_at` and current year.
  - Year summary cards (consistent days, overall completion percentage, total completed instances).

---

# 11 — Calendar — Month / Week / Day ✅

Build deeper calendar views.

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

_Done:_

- Month View (`_components/month-calendar.tsx`):
  - Standard 7-column calendar grid aligned to Monday–Sunday.
  - Shaded day cells showing day number, intensity color, and status dot.
  - Interactive click navigation directly into Day view.
  - Month summary metrics.
- Week View (`_components/week-calendar.tsx`):
  - 7-day card layout with weekday headers and date badges.
  - Live preview checklist of scheduled commitments for each day.
  - Click to select and drill into Day view.
- Day View (`_components/day-calendar.tsx`):
  - In-depth commitment-level view for any selected calendar date.
  - Large SVG Progress Ring (`140px`) and linear completion bar.
  - Full checklist of scheduled commitments with description and frequency details.
  - Interactive completion toggle: integrates directly with `completeCommitment` and `uncompleteCommitment` RPCs with optimistic UI update and rollback.
  - Guardrails: future dates and pre-journey dates show informative banners and disallow completion changes.
- Commitment Filter:
  - Dropdown selector supporting `All commitments` or filtering to any individual commitment.
  - Dynamically recalculates daily summaries, intensities, and streaks using `calculateFilteredDailySummary`.
- View Coordinator (`_components/calendar-view.tsx`):
  - Connected SegmentedControl switcher (`Year`, `Month`, `Week`, `Day`).
  - Bi-directional URL synchronization (`?view=&year=&month=&date=&commitment=`).
  - Single-query server loader (`getCalendarData`) streaming via `<Suspense>`.
  - Honest "Journey not started yet" empty state if `myc_started_at` is `null`.

---

# 12 — Analytics Dashboard ✅

Build the analytics dashboard around real database records.

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

_Done:_

- Full Analytics page at `apps/web/src/app/(app)/analytics/page.tsx` and `_components/analytics-view.tsx`:
  - 4 Key Metric Cards (`StatCard`): Current Streak, Best Streak, Consistent Days, Overall Consistency % (with progress rings and badges).
  - Reporting Period Selector: `Last 7 Days` (`7d`), `Last 30 Days` (`30d`), `This Year` (`year`), and `All Time` (`all`).
  - Weekly Consistency Bar Chart (`_components/analytics-chart.tsx`): 7-day bar chart with percentage heights, tooltips, and distinct diagonal styling for unscheduled days.
  - Monthly Consistency Bar Chart: Day-by-day bar chart with month navigation controls (previous/next month) bounded to the user's journey.
  - Commitment Performance Breakdown (`_components/commitment-performance-list.tsx`): Per-commitment cards showing kept instances, total scheduled instances, percentage badge, and linear progress bar.
  - Server fetcher `getAnalyticsData` with zero mock data and zero N+1 database queries.
  - Honest "Journey not started yet" state with CTA to define the first commitment.

---

# Fix — Immutable Commitment Completion, Activity Comments & Calendar Navigation Bug Fix ✅

Core product rule: Commitment completion is permanent historical record and cannot be undone or reverted.

_Done:_

- **Permanent Completion Immutability:**
  - Removed all uncomplete/undo interactions across Web (`TodayList`, `CommitmentsView`, `DayCalendar`) and Mobile (`App.tsx`). Completed items render permanent "Done" badges.
  - Dropped `daily_completions_delete_own` RLS policy.
  - Added statement-level trigger `tr_protect_daily_completion_immutability` rejecting any direct `UPDATE` or `DELETE` attempt by authenticated/anon roles.
  - Replaced `uncomplete_commitment` RPC with a function that throws an exception and revoked execution rights from `authenticated`.
- **Confirmation Flow with Optional Activity Notes:**
  - Added `comment text null check (comment is null or length(comment) <= 1000)` column on `daily_completions`.
  - Whitespace-trimmed; whitespace-only strings stored as `NULL`.
  - Created `CompleteCommitmentDialog` (`apps/web/src/components/commitments/complete-commitment-dialog.tsx`) with commitment name, date, character count (`X / 1000`), permanent warning notice, and clean submit/cancel controls.
- **Activity History & Timezone Timestamps:**
  - Added indexes `(user_id, completed_at DESC)` and `(user_id, commitment_id, completed_at DESC)`.
  - Added `getCompletionHistory` pure fetcher in `@myc/utils` with sorting by `completed_at DESC`.
  - Created `CommitmentHistoryDialog` (`apps/web/src/components/commitments/commitment-history-dialog.tsx`) displaying chronological completion history with exact formatted timestamps in user's IANA timezone and blockquoted notes.
  - Added Day Activity section in `DayCalendar` listing completed sessions for the date.
- **Calendar Navigation Bug Fix:**
  - Fixed issue where clicking previous/next arrows in `/calendar` changed URL/date label but failed to update commitment data.
  - Keyed `<CalendarView key={`${data.view}-${data.selectedDate}-${data.filterCommitmentId}`} />` in server component to cleanly remount with fresh server data.
  - Integrated `useTransition` with pending spinner and disabled states.
- **Supabase Realtime Multi-Device Sync:**
  - Added Realtime subscriptions on `daily_completions` in `CalendarView`, `DashboardView`, and `CommitmentsView` calling `router.refresh()` to propagate changes across devices without duplicate listeners.
- **Testing & Verification:**
  - 19 pgTAP tests in `daily_completions.test.sql` (36/36 tests passing across all test suites).
  - 21 unit tests in `@myc/utils` covering math, immutability, date formatting, and streak edge cases.
  - `npm run check` and `npm run build:web` passing with zero errors.

---

# 13 — PWA ✅

Transform the Next.js Web application into a production-ready, installable Progressive Web App (PWA).

**Implemented:**

- **Web App Manifest (`apps/web/src/app/manifest.ts`):**
  - Generated dynamic manifest served at `/manifest.webmanifest`.
  - Configured `id: "/"`, `name: "MYC — Make Yourself Consistent"`, `short_name: "MYC"`, `description`, `start_url: "/dashboard?source=pwa"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait-primary"`, `theme_color: "#18181b"`, `background_color: "#09090b"`.
  - Icon suite: 192x192, 512x512 standard PNGs (`purpose: "any"`), 192x192 and 512x512 maskable PNGs (`purpose: "maskable"`), plus `apple-touch-icon.png` (180x180) in `public/icons/` and `/apple-icon.png`.
  - Categories: `productivity`, `lifestyle`, `utilities`.
- **Vanilla Service Worker (`apps/web/public/sw.js`):**
  - Modular vanilla service worker fully compatible with Next.js 16 and Turbopack (no fragile webpack plugins).
  - Versioned cache scopes (`myc-v1`): `myc-shell-myc-v1` (pre-cached offline shell, manifest, app icons) and `myc-static-myc-v1` (immutable JS/CSS chunks, fonts, public images).
  - Clean lifecycle: Pre-caches on `install`, clears previous versions on `activate`, and listens for `SKIP_WAITING` messages to activate updates without page tearing.
- **Security-First Caching Rules (`packages/utils/src/pwa.ts`):**
  - **Network-First for Navigations:** Fetches fresh server HTML; falls back to pre-cached `/offline` shell only on network failure.
  - **Cache-First for Static Assets:** Static hashed scripts, CSS chunks, fonts, and icons cached with background revalidation.
  - **Network-Only (Never Cached):** Supabase API (`*.supabase.co`, `/rest/v1/*`, `/auth/v1/*`), mutation methods (`POST`, `PUT`, `PATCH`, `DELETE`), authenticated user sessions, cookies, and sensitive query strings.
- **Offline Shell (`apps/web/src/app/offline/`):**
  - Dedicated branded offline fallback shell at `/offline`.
  - Clear, reassuring explanation of data integrity: explains that commitment data and streaks require live connection to preserve consistency history.
  - No fake buttons, no fabricated streak numbers, no simulated completion states.
  - Interactive "Try again" reload action and link to Dashboard.
- **Controlled App Updates (`UpdateNotice`):**
  - `registerServiceWorker` detects new worker waiting in background.
  - Discreet, floating update banner notifies user without jarring interruptions.
  - User-driven actions: "Update now" (sends `SKIP_WAITING` and reloads safely) or "Later" (dismisses banner).
  - Duplicate reload guard prevents infinite refresh loops.
- **Install Experience (`InstallPrompt` & `PwaProvider`):**
  - React Context (`PwaProvider`) uses `useSyncExternalStore` for standalone display-mode detection.
  - Captures `beforeinstallprompt` event on Chromium / Android / Edge.
  - In Settings (`/settings`), provides dedicated "App & Installation" card showing installation status:
    - Installed/Standalone: "App Installed" badge with device integration confirmation.
    - Chromium/Android: Native "Install App" button triggering deferred prompt.
    - iOS Safari: Clear step-by-step guidance (Share button → "Add to Home Screen").
    - Unsupported / Desktop fallback instructions.
- **Smart Install App Popup (`apps/web/src/components/pwa/install-app-popup.tsx`):**
  - Polished, non-intrusive floating card using locked MYC design tokens (`bg-card`, `border-border/80`, `shadow-raised`, `BrandMark`).
  - **Smart Timing:** Evaluated after a 10-second delay (`INSTALL_DELAY_MS`) from initial application mount.
  - **Single App-Level Controller:** Controller lives in `PwaProvider` across the entire session; route transitions never restart the timer or trigger duplicate popups.
  - **Route Suppression:** Automatically suppressed on critical paths (`/onboarding`, `/offline`, `/verify-email`, `/reset-password`) to prevent interrupting first-commitment creation or sensitive auth flows.
  - **Dismissal & Cooldown:** Dismissing via "Maybe Later" or the close button sets an in-memory session dismissal flag and a 7-day cooldown timestamp (`INSTALL_COOLDOWN_DAYS = 7`) in `localStorage` (`myc_pwa_install_dismissed_until`).
  - **Platform-Aware Actions:** Triggers native install on Chromium/Android, provides inline Safari "Share → Add to Home Screen" instructions on iOS, and suppresses automatic popups on unsupported desktop browsers to avoid nonfunctional buttons.
  - **Installed Suppression:** Automatically suppressed whenever running in standalone mode or once installation is completed.
- **Middleware & Header Configuration:**
  - `apps/web/src/proxy.ts`: Explicitly excluded `/sw.js` from proxy route matcher.
  - `apps/web/next.config.ts`: Set `Cache-Control: no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /` on `/sw.js`.
- **Testing & Quality Assurance:**
  - 9 automated unit tests in `packages/utils/src/pwa.test.ts` (30 total unit tests in `@myc/utils` passing).
  - Verified `npm run check` (Prettier, ESLint, TypeScript across all workspaces).
  - Verified `npm run build:web` with Next.js 16 and Turbopack.

Tested platforms:

```text
Windows (Chrome, Edge)
macOS (Chrome, Safari standalone)
Ubuntu / Linux (Chrome, Chromium)
Android (Chrome, Brave, Samsung Internet)
```

---

# 14 — Android App ✅

The native Android client for MYC built using Expo SDK 57 and React Native 0.86 with New Architecture.

**Zero Duplicate Business Logic:**

- Uses the same Supabase database, RLS policies, RPCs (`complete_commitment`, `confirm_first_commitment`, `ensure_profile`), and pure consistency engine calculations in `@myc/utils`.
- Adheres strictly to permanent completion immutability (no unchecking/undoing, optional activity comment up to 1,000 characters, user local calendar dates).

**Implemented Features & Parity:**

- **Authentication & Persistence (`src/screens/auth/AuthScreen.tsx`):**
  - Sign in, Sign up, Forgot password, and verification notice.
  - Native Google OAuth flow with `WebBrowser.openAuthSessionAsync` and custom scheme `myc://auth/callback`.
  - Secure session persistence backed by `expo-secure-store` via `ExpoSecureStoreAdapter`.
- **Design System & Tokens (`src/lib/theme.ts`):**
  - Identical palette: warm off-white canvas, crisp card surface, muted borders, text colors, and pastel tones (`sky`, `lavender`, `peach`, `mint`, `sun`).
  - Consistent elevation shadows and typography.
  - Reusable UI primitives: `Button`, `Card`, `Badge`, `Input`, `SegmentedControl`, `Modal`, `BrandMark`, `StatCard`, `ProgressBar`, `ProgressRing`.
- **Curved Navigation Shell (`src/components/layout/`):**
  - `AppHeader`: Smooth curved bottom edge (`rounded-b-[1.75rem]`), BrandMark logo, and avatar dropdown modal containing **Profile**, **Settings**, and **Logout** in exact parity with the web mobile layout.
  - `BottomNav`: Fixed navigation bar with smooth curved top edge (`rounded-t-[1.75rem]`), elevated shadow, active indicator pill, and quick navigation between Dashboard, Calendar, Commitments, and Analytics.
- **Dashboard (`src/screens/dashboard/DashboardScreen.tsx`):**
  - Supabase Realtime subscription on `daily_completions` and `commitments` for instant cross-device updates.
  - 4 core metrics (Today's score, Current streak, Best streak, Total active).
  - "Today's Focus" hero card with circular `ProgressRing`.
  - Today's commitment list with permanent completion status and modal trigger.
  - 7-day mini consistency column chart.
- **Calendar (`src/screens/calendar/CalendarScreen.tsx`):**
  - Automatically defaults to **Day view** for the current date.
  - Day, Week, Month, and Year view switcher with consistent segmented control.
  - Commitment filter bar with pill selectors.
  - Previous / next period navigation with today jump button.
  - Day view with completion action and activity history log with notes.
  - Month contribution grid with intensity levels 0..4.
- **Commitments Management (`src/screens/commitments/CommitmentsScreen.tsx`):**
  - Active, Paused, and Archived segmented tabs.
  - Rich commitment cards with tone accent bars, schedule badges, completion actions, and history modals.
  - Pause, resume, archive, restore, and delete actions with confirmation dialogs.
  - `CommitmentFormModal` for creating new commitments with frequency picker, day selectors, and pledge.
- **Analytics Dashboard (`src/screens/analytics/AnalyticsScreen.tsx`):**
  - Lifetime metric cards (Current streak, Best streak, Consistent days, Overall consistency %).
  - Period selector: 7d, 30d, year, all.
  - Circular progress ring, monthly consistency bar chart, and commitment performance breakdown.
- **Dedicated Profile & Settings:**
  - `ProfileScreen.tsx`: Dedicated Profile page showing email, verified badge, member-since date, journey day count, and searchable timezone picker modal.
  - `SettingsScreen.tsx`: Change password modal, password reset via email, Google account connect/disconnect with lockout protection, local sign out, and global sign out.
- **Quality Gates:**
  - `npm run check` passes across all monorepo packages.
  - `npm run build:web` passes.
  - `npx expo-doctor` passed with 21/21 checks passing.

---

# Single Day Commitment Frequency — Complete End-to-End Integration ✅

Implemented a third commitment frequency, **Single Day**, across the entire MYC platform (Web/PWA, Android native app, Supabase database, consistency engine, analytics, calendar, and tests) prior to Phase 15.

- **Feature Scope:**
  - One-time planned commitments scheduled for today or any future date that never repeat.
  - Frequency selector options: `Every day | Selected days | Single day` across Web/PWA and Android.
  - Native pastel month-navigation calendar date picker on both platforms with disabled past dates, month switcher, today shortcut, and empty/selected state messaging (no WebView).
  - Editing guards: Prevents accidental conversion between recurring and single-day commitments.
- **Database & Backend Foundation:**
  - Migrations: `20261021032908_single_day_commitments.sql`, `20261021033202_drop_old_commitments_check.sql`, `20261021033338_single_day_triggers_refine.sql`.
  - Stored as pure `DATE` (`scheduled_date date null`), ensuring timezone stability.
  - Constraints: `frequency IN ('daily', 'specific_days', 'single_day')`, `schedule_days IS NULL` for `single_day`, and `scheduled_date IS NOT NULL` for `single_day`.
  - Partial index `idx_commitments_user_scheduled_date` on `(user_id, scheduled_date)` where `frequency = 'single_day'`.
  - Triggers enforce timezone-aware past-date rejection, lock scheduled dates once completed, and allow future single-day commitments without prematurely starting the user's MYC journey (`myc_started_at` remains NULL).
  - Completion rules enforce completions strictly on `date = scheduled_date`.
- **Consistency Engine & Analytics (`@myc/utils`):**
  - Centralized scheduling via `isCommitmentExpectedOnDate`: Evaluates `single_day` commitments only on their exact `scheduled_date`.
  - Streak engine, consistency percentage, daily score, and period summaries exclude future one-time commitments from historical metrics.
- **Calendar & Navigation Parity:**
  - Single-day commitments appear on their scheduled date in Day, Week, Month, and Year views.
  - Forward date navigation enabled up to the maximum scheduled date (+ 1 year).
  - Month and Week view cards/cells for upcoming dates are interactive, linking directly to Day view.
- **Notification Readiness:**
  - `scheduled_date` stored cleanly as SQL `date`, ready for Phase 17 push reminders without schema changes.
- **Verification:**
  - 49/49 pgTAP tests pass (`npm run db:test`).
  - 36/36 `@myc/utils` unit tests pass.
  - `npm run check` (format check, lint, typecheck, tests) passes across all workspaces.
  - `npm run build:web` passes (Turbopack production build).
  - `npm run db:types:check` passes with zero schema drift.

---

# 15 — Android Home Screen Widget ⭐ ✅

Implemented production-ready, native Android home-screen widgets for MYC (Make Yourself Consistent) with full continuous native generation (CNG) via an Expo config plugin.

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

### Implemented:

- **Three Native Widget Types:**
  - **Widget A (Compact):** Designed for 2x1/2x2 cells. Displays MYC brand pill, today's completion count (`2/3`), streak flame (`🔥 14d`), and mini progress bar. Tap opens Dashboard.
  - **Widget B (Standard — Today's Commitments):** Default 3x2/4x2 widget. Displays today's scheduled commitments with completion icons (checked green circle vs subtle outline), completion progress badge (`2/3`), streak pill (`🔥 14 days`), and overflow indicator (`+N more`). Responsive slots adapt based on widget height.
  - **Widget C (Large — Consistency Dashboard):** 4x3/4x4 comprehensive dashboard. Shows current streak (`🔥 14 days`), all-time best streak (`🏆 21d best`), completion progress bar and percentage, up to 5 commitment rows with overflow handling, and an "Open MYC" quick-action button.
- **Continuous Native Generation (CNG) Architecture:**
  - Config plugin `apps/mobile/plugins/withAndroidWidgets.js` automates registration of widget receivers in `AndroidManifest.xml`, injects `MycWidgetPackage` into `MainApplication.kt`, and compiles native layouts, drawables, strings, and Kotlin providers.
- **Shared Snapshot Storage & Zero Logic Duplication:**
  - App and widgets communicate via private `SharedPreferences` (`myc_widget_prefs`).
  - Zero business logic duplication: computed display state is produced in TypeScript using shared `@myc/utils` (`getDashboardConsistencyData`, `getUserLocalDateString`), adhering to user profile timezone.
- **Security & Signed-Out Handling:**
  - Absolutely zero raw tokens, passwords, or emails stored in widget preferences. Only minimal display attributes (title, completion boolean, streak number, date).
  - Clean, neutral prompt displayed when signed out ("Sign in to MYC to view commitments") with tap opening `myc://auth`.
  - Immediate purge on local or global sign-out (`signOutMobile`, `signOutAllDevicesMobile`).
- **Real-Time Data Refresh:**
  - Periodic background update (`updatePeriodMillis="1800000"` / 30m).
  - Real-time foreground update on dashboard load, commitment completion, creation, edit, or delete, and AppState resume.
- **Deep Linking:**
  - Explicit PendingIntent navigation scheme (`myc://dashboard`, `myc://commitment/<id>?action=complete|detail`, `myc://auth`).
  - Tapping uncompleted commitment deep links directly into the mobile app's `CompleteCommitmentModal`.
  - Tapping completed commitment opens detail/history modal.
  - Tapping header or empty state opens Dashboard.

---

# 16 — Cross-Platform Sync ✅

Implemented seamless multi-platform data convergence across Web, Android, and Android home-screen widgets:

- **Web → Android → Widget:**
  - Completions on Web are committed to Supabase `daily_completions`.
  - Android application listens via Supabase Realtime (`daily_completions` and `commitments` channels).
  - Mobile refreshes state and updates the private native widget snapshot (`syncWidgetData`).
  - Home-screen widgets (Compact, Standard, Large) display the updated completion ratios and streaks.
- **Android / Widget → Web:**
  - In-app completions or widget deep-link completion actions (`myc://commitment/<id>?action=complete`) submit immutable completion records.
  - Native widgets update immediately.
  - Web screens (`dashboard`, `commitments`, `calendar`) receive Postgres changes via Supabase Realtime and re-render server state with render-time prop synchronization.
- **Resilience & Background Recovery:**
  - Android `AppState` active listener refetches dashboard and commitments on foreground resume.
  - Web `window.addEventListener("focus")` and `window.addEventListener("online")` guarantee recovery from network disconnects or dormant browser tabs.
  - Session sign-out triggers immediate widget reset (`clearWidgets()`) with zero token leakage.

---

# 17 — Notifications ✅

Production-ready, calm, non-judgmental consistency reminders adhering to PRD §43:

- **Schema & RLS:**
  - Migration `20261025003500_notification_preferences.sql` creating `public.notification_preferences`.
  - Check constraints for 24-hour time strings (`^([01][0-9]|2[0-3]):[0-5][0-9]$`).
  - Owner-only RLS policies with field immutability trigger and comprehensive pgTAP tests.
- **Notification Types:**
  - **Daily check-in reminder:** Morning prompt to reflect and focus on today's commitments.
  - **Incomplete commitments reminder:** Evening reminder triggered only if scheduled commitments remain open.
  - **Streak encouragement reminder:** Non-threatening motivation to keep momentum alive.
- **Platforms:**
  - **Android:** Native scheduled local notifications via `expo-notifications`, Android 8+ notification channel `myc-reminders` with gentle priority, and notification response listener deep-linking to `myc://dashboard`.
  - **Web:** Browser permission requests with graceful unsupported/blocked status banners and real-time settings persistence.
- **User Controls:**
  - Master toggle + individual reminder toggles.
  - Configurable reminder times (`07:00` through `22:00`).
  - Settings UI in both Web (`NotificationSettingsSection`) and Android (`SettingsScreen`).
  - Immediate notification cancellation on sign-out (`clearNotificationsAsync`).

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
