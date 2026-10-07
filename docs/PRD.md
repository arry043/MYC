# MYC — Make Yourself Consistent
## Product Requirements Document (PRD)
**Version:** 2.0  
**Status:** Phase 1 — Development Ready  
**Date:** October 7, 2026

---

# 1. Product Overview

**MYC (Make Yourself Consistent)** is a consistency-focused productivity platform that helps users build consistency around self-defined commitments.

MYC is **not primarily a Todo app**.

The core philosophy is:

> **Don't rely on motivation. Build consistency.**

Users define commitments, commit to them, complete them every day, and build measurable proof of their consistency through streaks, calendars, analytics, and eventually device widgets.

---

# 2. Product Vision

MYC should become a user's **daily consistency layer** across their devices.

The long-term experience:

```text
Create Commitment
       ↓
"I COMMIT"
       ↓
Show up every day
       ↓
Complete commitments
       ↓
Build consistency
       ↓
See your history
       ↓
Access MYC anywhere
       ↓
Home-screen widget reminds you
```

---

# 3. Problem

Users frequently:

- Set goals but don't maintain them.
- Start projects and abandon them.
- Depend on motivation.
- Lose track of their progress.
- Cannot clearly see how consistent they actually are.
- Use todo apps that focus on tasks rather than long-term consistency.

MYC addresses this by turning daily actions into **visible consistency data**.

---

# 4. Core Product Principle

### MYC measures showing up.

A successful day should not simply mean:

> "I opened the app."

It should mean:

> **"I completed the commitments I made for today."**

---

# 5. Product Philosophy

### 5.1 Consistency > Motivation

MYC should encourage systems rather than temporary motivation.

### 5.2 Never Miss Twice

Missing one day should not create guilt or destroy the user's progress.

The system should encourage:

> **Miss once. Come back tomorrow.**

### 5.3 Proof Over Promises

The calendar and analytics should show users evidence of their behavior.

### 5.4 User-defined commitments

MYC does not dictate what users should accomplish.

The user decides.

Examples:

- Solve 3 DSA problems
- Work on project for 1 hour
- Read 20 pages
- Workout
- Write a blog
- Practice coding
- Study for 2 hours

---

# 6. Target Users

### Primary

Students, developers, creators and professionals who want to maintain daily consistency.

### Secondary

Anyone building:

- Study habits
- Fitness routines
- Coding routines
- Creative habits
- Side projects
- Personal development routines

---

# 7. MVP Scope

Phase 1 will focus on:

### Web/PWA

- Authentication
- Onboarding
- Commitment creation
- `I COMMIT` flow
- Daily completion
- Streaks
- MYC Calendar
- Analytics
- Profile/settings
- PWA installation

### Android

- Login
- Same MYC account
- Same backend/data
- Daily commitments
- Completion
- **Android Home Screen Widget**

### Backend

- Supabase Auth
- PostgreSQL
- Row Level Security
- Realtime where useful
- Edge Functions where required

---

# 8. Platform Strategy

## Phase 1

```text
                  SUPABASE
               MYC Backend
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
       Next.js             Expo
       Web/PWA           React Native
          │                   │
    Desktop/Web          Android App
                            │
                            ↓
                    Android Widget
```

### Web/PWA

Targets:

- Chrome
- Edge
- Safari
- Firefox where supported

Can be installed on:

- Windows
- macOS
- Ubuntu/Linux

No native desktop application required for MVP.

### Android

Expo/React Native application with Android-specific widget implementation.

### Future

- iOS
- iOS WidgetKit
- macOS native widgets
- Ubuntu/Linux desktop widgets
- Additional platform integrations

---

# 9. Important Architecture Decision

### PWA ≠ Home Screen Widget

The PWA is the main MYC application.

The widget is a platform-specific interface.

Therefore:

```text
MYC Backend
     │
     ├── Web/PWA
     │
     ├── Android App
     │      └── Android Widget
     │
     ├── iOS App
     │      └── iOS Widget
     │
     └── Desktop Integrations
```

The **business logic and data remain centralized**.

Only the platform-specific presentation layer changes.

---

# 10. Authentication

Supabase Auth will manage authentication.

Initial options:

- Email/password
- Email verification
- Password reset
- Session management

Future:

- Google
- Apple
- Other OAuth providers

### Requirements

Users must have a unique account.

All user-specific data must be protected through Supabase RLS.

---

# 11. Onboarding

After registration:

```text
Create Account
      ↓
Welcome to MYC
      ↓
Explain MYC philosophy
      ↓
Create first commitment
```

The user should understand:

> MYC starts when you make your first commitment.

---

# 12. MYC Start Date — Critical Rule

**Account creation date is NOT the MYC start date.**

These must be separate.

```text
account_created_at
        ≠
myc_started_at
```

### MYC Start Date

The MYC journey officially begins when:

1. User creates their first commitment.
2. User confirms using:

> **I COMMIT**

At that moment:

```text
myc_started_at = current date
```

If the user already has a MYC start date, creating additional commitments must **not** reset it.

---

# 13. Commitment System

A commitment represents something the user intends to consistently do.

### Example

```text
Title:
Solve 3 DSA Problems

Description:
Practice DSA every day.

Frequency:
Daily

Start:
07 Oct 2026
```

### Commitment fields

- ID
- User ID
- Title
- Description
- Start date
- End date
- Frequency
- Status
- Created timestamp
- Updated timestamp

---

# 14. Commitment Creation

User flow:

```text
Create Commitment
       ↓
Title
       ↓
Description
       ↓
Schedule
       ↓
Review
       ↓
I COMMIT
```

For the first commitment:

**I COMMIT** establishes the MYC start date.

---

# 15. Daily Completion

Each commitment produces a daily expected action.

Example:

```text
07 Oct

☑ Solve 3 DSA
☑ Work on Project
☐ Write Blog
☑ Workout
```

System records completion per commitment per date.

---

# 16. Completion Rules

Each commitment/day should have a state such as:

- Completed
- Incomplete
- Not scheduled
- Future
- Missed

A completion record must be associated with:

```text
user
commitment
date
status
completed_at
```

---

# 17. Consistent Day

A **consistent day** is determined from the user's expected commitments.

For example:

```text
Expected: 4
Completed: 4

Consistency = 100%
```

```text
Expected: 4
Completed: 3

Consistency = 75%
```

Exact rules can be configurable during implementation, but the system must clearly distinguish:

- Completed commitment
- Missed commitment
- Non-scheduled day
- Future day

---

# 18. Streak System

MYC should calculate:

### Current Streak

Number of consecutive qualifying days leading up to today.

### Best Streak

Longest consistency streak historically.

### Consistent Days

Total qualifying consistent days.

### Overall Consistency

```text
Completed expected actions
────────────────────────── × 100
Total expected actions
```

The exact definition of a "consistent day" should remain consistent across calendar and analytics.

---

# 19. Calendar

The calendar is one of MYC's primary features.

It should resemble a **contribution calendar**, similar in concept to GitHub/LeetCode activity visualization.

### Calendar hierarchy

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

---

# 20. Year View

Primary visualization.

Shows:

```text
MYC
2026

Jan  Feb  Mar  Apr ...

▢ ▢ ▣ ▣ ▢ ▣ ▣
▣ ▣ ▣ ▢ ▣ ▣ ▣
...
```

Intensity represents consistency/activity.

Users can hover or click a day.

---

# 21. Calendar Start Point

The calendar **must not automatically start from January 1.**

It starts at:

```text
myc_started_at
```

Example:

```text
MYC Started:
7 October 2026

Calendar:
7 Oct → Today
```

Future dates should remain empty/disabled.

---

# 22. Current Day

The current date should have a clear visual indicator.

Example:

```text
Yesterday   Today   Tomorrow
   ▣          ◉        ▫
```

Tomorrow and other future dates cannot be marked complete.

---

# 23. Month View

Month view provides deeper analysis.

Should show:

- Calendar dates
- Completion status
- Daily percentage
- Commitments
- Streak information
- Missed days

---

# 24. Week View

Designed for short-term analysis.

Example:

```text
Mon Tue Wed Thu Fri Sat Sun

 ✓   ✓   ✓   ✗   ✓   ✓   ✓
```

Users can quickly understand their current week.

---

# 25. Day View

Shows exact commitment-level details.

```text
07 October

Consistency: 75%

☑ DSA
☑ Project
☐ Blog
☑ Workout
```

---

# 26. Calendar Filtering

Users should be able to filter the calendar by:

- All commitments
- Individual commitment

Example:

```text
Filter:
[ All ▼ ]

[ DSA ]
[ Project ]
[ Workout ]
[ Reading ]
```

This allows users to understand individual consistency.

---

# 27. Analytics Dashboard

The dashboard should provide meaningful consistency metrics.

### Primary metrics

- Current streak
- Best streak
- Consistent days
- Overall consistency %
- Today's completion
- Weekly consistency
- Monthly consistency

### Future metrics

- Commitment performance
- Longest active period
- Missed-day patterns
- Weekly trends
- Monthly trends

---

# 28. Dashboard Example

```text
Good Morning, Arry

Today's Progress
████████░░ 80%

4 / 5 Completed

🔥 14 Day Streak

Best Streak
27 Days

Overall Consistency
82%

--------------------

Today's Commitments

☑ DSA
☑ Project
☑ Workout
☑ Reading
☐ Blog
```

---

# 29. Android Widget

The Android widget is a **core Phase 1 requirement**.

The widget should provide useful information without requiring the user to open the app.

Example:

```text
┌──────────────────────┐
│ MYC                  │
│                      │
│ TODAY                │
│                      │
│ ☑ DSA                │
│ ☑ Project            │
│ ☐ Blog               │
│                      │
│ 2 / 3                │
│ 🔥 14 days           │
└──────────────────────┘
```

---

# 30. Widget Requirements

Widget should display:

- Today's date
- Today's commitments
- Completion status
- Completion count
- Current streak
- Progress percentage

Where technically supported, users should be able to interact directly with the widget.

For example:

```text
☐ Blog
```

could potentially be marked complete directly from the widget.

---

# 31. Widget Data Architecture

Widget should never maintain a separate source of truth.

```text
Supabase
   ↓
MYC API / secure data layer
   ↓
Android Widget
```

When a user completes a task:

```text
Android
   ↓
Supabase
   ↓
Updated MYC state
   ↓
Widget refresh
```

Similarly:

```text
Web
 ↓
Supabase
 ↓
Widget refresh
```

---

# 32. Widget Authentication

Widget access must be securely associated with the user's authenticated account.

Do not expose:

- Supabase service-role keys
- Private credentials
- Other users' data

The widget must only access the current user's permitted data.

---

# 33. Data Model

Initial database structure:

### `profiles`

```text
id
user_id
myc_started_at
timezone
created_at
updated_at
```

### `commitments`

```text
id
user_id
title
description
start_date
end_date
frequency
status
created_at
updated_at
```

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

### Future

```text
notifications
devices
widget_preferences
analytics
subscriptions
```

---

# 34. Timezone

Timezone is important because MYC is date-based.

Each user should have a timezone.

Example:

```text
Asia/Kolkata
```

Daily completion should be evaluated according to the user's configured timezone.

Avoid using server UTC dates directly for user-facing daily calculations.

---

# 35. Security

Supabase Row Level Security must be enabled.

Users can only:

```text
READ their own data
CREATE their own data
UPDATE their own data
DELETE their own data
```

Never trust the client to enforce authorization.

Authorization must also be enforced at the database/API layer.

---

# 36. Technology Stack

## Web

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
```

## Backend

```text
Supabase
PostgreSQL
Supabase Auth
RLS
Realtime
Edge Functions
```

## Android

```text
Expo
React Native
TypeScript
Android native widget layer
```

## PWA

```text
Next.js
Web App Manifest
Service Worker
Offline caching where appropriate
```

---

# 37. PWA Requirements

The web application should support:

- Installability
- App icon
- Standalone window
- Splash/loading experience where supported
- Responsive UI
- Mobile layout
- Desktop layout
- Basic offline shell
- Secure HTTPS deployment

PWA installation should **not create a second MYC account or separate data store**.

---

# 38. Responsive Design

The same MYC product should work across:

- Desktop
- Laptop
- Tablet
- Mobile browser

However, responsive web UX should not be treated as a substitute for the Android widget.

---

# 39. Notifications

Not required for the initial core MVP but should be architected for future support.

Potential notifications:

- Daily commitment reminder
- Incomplete commitment reminder
- Streak reminder
- "Don't break your consistency" reminder

Notifications must avoid guilt-heavy messaging.

---

# 40. Offline Strategy

The MVP can initially prioritize online functionality.

Future offline support:

```text
Local state
   ↓
Offline completion
   ↓
Sync queue
   ↓
Supabase
```

Conflict resolution must be designed before enabling full offline writes.

---

# 41. Error Handling

The system must handle:

- Network failure
- Duplicate completion
- Expired session
- Invalid commitment
- Deleted commitment
- Future-date completion attempt
- Timezone changes
- Concurrent updates
- Widget synchronization failure

The UI should provide clear recovery actions.

---

# 42. Edge Cases

### User creates account but no commitment

```text
myc_started_at = NULL
```

Calendar should not falsely show a consistency journey.

### User creates first commitment

```text
I COMMIT
     ↓
myc_started_at = today
```

### User creates second commitment

Do not modify `myc_started_at`.

### User misses a day

Do not delete their history.

### User deletes a commitment

Historical data should follow a clearly defined retention rule.

### Future dates

Cannot be marked completed.

### Timezone changes

Historical dates must not randomly shift.

---

# 43. UX Principles

MYC should feel:

- Calm
- Premium
- Focused
- Motivating
- Non-judgmental
- Data-driven

Avoid:

- Excessive gamification
- Aggressive red warnings
- Shame-based copy
- Notification spam
- Too many badges

---

# 44. Core Navigation

Suggested navigation:

```text
MYC

Dashboard
Calendar
Commitments
Analytics
Profile
Settings
```

On mobile:

```text
Home
Calendar
Commitments
Profile
```

---

# 45. Dashboard Priority

Dashboard should answer three questions immediately:

### 1. What do I need to do today?

### 2. How am I doing?

### 3. How consistent have I been?

---

# 46. Commitment Lifecycle

```text
Draft
  ↓
Committed
  ↓
Active
  ↓
Completed / Paused / Archived
```

The system should preserve historical consistency records.

---

# 47. MVP Acceptance Criteria

Phase 1 is considered functional when:

### Authentication

- User can register.
- User can log in.
- User can log out.
- User sessions persist securely.

### Commitments

- User can create a commitment.
- User can edit it.
- User can pause/archive it.
- User can create multiple commitments.

### MYC Start

- First `I COMMIT` sets `myc_started_at`.
- Account creation does not set `myc_started_at`.
- Additional commitments do not reset it.

### Daily tracking

- User can complete commitments.
- Completion persists.
- Future dates cannot be completed.

### Calendar

- Calendar begins from MYC start date.
- Current date is highlighted.
- Future dates are disabled/empty.
- Year/month/week/day views work.
- Filtering works.

### Analytics

- Current streak works.
- Best streak works.
- Consistency percentage works.
- Consistent-day count works.

### PWA

- Website is installable.
- Standalone mode works.
- Data remains synchronized.

### Android

- User can log in.
- User can see commitments.
- User can complete commitments.
- Android widget displays current MYC data.

---

# 48. Phase 1 Non-Goals

Do **not** build initially:

- iOS native app
- iOS widgets
- macOS native widgets
- Ubuntu native widgets
- Windows native application
- Payments
- Premium subscriptions
- Complex social features
- AI coaching
- Advanced gamification
- Wearables

These come later.

---

# 49. Future Roadmap

## Phase 1

**Web/PWA + Android + Android Widget**

↓

## Phase 2

**iOS + iOS Widget**

↓

## Phase 3

**macOS + Apple ecosystem integration**

↓

## Phase 4

**Ubuntu/Linux desktop integrations**

↓

## Phase 5

Potential:

- AI consistency coach
- Smart reminders
- Advanced analytics
- Wearables
- Apple Watch
- Android Wear
- Social accountability
- Premium plans
- Advanced personalization

---

# 50. Long-Term Architecture

```text
                         ┌─────────────────┐
                         │   MYC CLOUD     │
                         │    Supabase     │
                         ├─────────────────┤
                         │ Auth            │
                         │ PostgreSQL      │
                         │ RLS             │
                         │ Realtime        │
                         │ Edge Functions  │
                         └────────┬────────┘
                                  │
                         MYC Data/API Layer
                                  │
          ┌───────────────────────┼──────────────────────┐
          │                       │                      │
          ▼                       ▼                      ▼
     Next.js/PWA             Expo Android            iOS App
          │                       │                      │
          │                       ▼                      ▼
          │                Android Widget          iOS Widget
          │
     Desktop PWA
          │
   ┌──────┼──────┐
   ▼      ▼      ▼
Windows macOS Ubuntu
```

---

# 51. Key Product Decision

### MYC should be backend-first and client-independent.

The backend owns:

- Users
- Commitments
- Completion history
- Dates
- Streak calculations
- Consistency
- Analytics

Clients simply present and interact with that data.

This allows:

```text
Web → same data
Android → same data
iOS → same data
Widget → same data
Desktop → same data
```

---

# 52. Success Metrics

Initial product metrics:

- Registered users
- Users who create first commitment
- `I COMMIT` conversion rate
- Daily active users
- Commitment completion rate
- 7-day retention
- 30-day retention
- Average consistency %
- Average active streak
- Widget adoption
- Daily widget interactions

Most important early metric:

> **Percentage of users who continue completing commitments after their first week.**

---

# 53. Core MYC Promise

The product should ultimately communicate one simple idea:

> **You don't need more motivation. You need proof that you can keep showing up.**

And MYC's job is to provide that proof.

---

## Phase 1 Final Definition

**Build this first:**

```text
MYC
│
├── Next.js Web
│      └── PWA
│
├── Supabase
│      ├── Auth
│      ├── PostgreSQL
│      ├── RLS
│      └── Realtime
│
└── Android
       ├── Expo App
       └── Home Screen Widget
```

**One backend. One consistency system. Multiple interfaces.**

This is the **updated baseline PRD** we should use for MYC development going forward.