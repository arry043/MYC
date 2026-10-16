import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Commitment,
  ConsistencyMetrics,
  DailyCommitmentItem,
  DailyCompletion,
  DailyConsistencySummary,
  Database,
  Profile,
  Weekday,
} from "@myc/types";

/**
 * Validates whether a string is a recognized IANA timezone identifier.
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string" || timezone.length > 64) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// 1. Timezone-aware date helpers
// ==========================================

/**
 * Gets the current calendar date in 'YYYY-MM-DD' format for a given IANA timezone.
 * Defaults to the environment's local timezone if none or invalid is provided.
 */
export function getUserLocalDateString(timezone?: string): string {
  const tz = timezone && isValidTimezone(timezone) ? timezone : undefined;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Returns the ISO-8601 day of the week for a given 'YYYY-MM-DD' string.
 * 1 = Monday, 2 = Tuesday, ..., 7 = Sunday.
 */
export function getIsoWeekday(dateStr: string): Weekday {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;

  // Construct date at UTC noon to avoid any timezone DST shifts
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayIndex = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return (dayIndex === 0 ? 7 : dayIndex) as Weekday;
}

/**
 * Adds (or subtracts) a number of days to a 'YYYY-MM-DD' string and returns the new 'YYYY-MM-DD'.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;

  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dateNum = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dateNum}`;
}

/**
 * Generates an inclusive array of 'YYYY-MM-DD' dates between startDateStr and endDateStr.
 * If startDateStr > endDateStr, returns an empty array.
 */
export function getDateRange(startDateStr: string, endDateStr: string): string[] {
  if (startDateStr > endDateStr) {
    return [];
  }
  const dates: string[] = [];
  let curr = startDateStr;
  while (curr <= endDateStr) {
    dates.push(curr);
    curr = addDays(curr, 1);
  }
  return dates;
}

/**
 * Checks whether a given 'YYYY-MM-DD' date is in the future relative to the user's timezone.
 */
export function isDateInFuture(dateStr: string, timezone?: string): boolean {
  const today = getUserLocalDateString(timezone);
  return dateStr > today;
}

// ==========================================
// 2. Commitment Scheduling & Eligibility
// ==========================================

/**
 * Determines whether a commitment is expected to be done on a specific calendar date.
 */
export function isCommitmentExpectedOnDate(
  commitment: Commitment,
  dateStr: string,
  mycStartedAt?: string | null,
): boolean {
  // Only active commitments can be expected
  if (commitment.status !== "active") {
    return false;
  }

  // Cannot be expected before the journey start date
  if (mycStartedAt && dateStr < mycStartedAt) {
    return false;
  }

  // Cannot be expected before the commitment's start date
  if (dateStr < commitment.start_date) {
    return false;
  }

  // Cannot be expected after the commitment's end date (if defined)
  if (commitment.end_date && dateStr > commitment.end_date) {
    return false;
  }

  // Frequency and schedule days matching
  if (commitment.frequency === "daily") {
    return true;
  }

  if (commitment.frequency === "specific_days") {
    if (!commitment.schedule_days || commitment.schedule_days.length === 0) {
      return false;
    }
    const dow = getIsoWeekday(dateStr);
    return commitment.schedule_days.includes(dow);
  }

  return false;
}

/**
 * Filters a list of commitments down to only those expected on the given calendar date.
 */
export function getExpectedCommitmentsForDate(
  commitments: Commitment[],
  dateStr: string,
  mycStartedAt?: string | null,
): Commitment[] {
  return commitments.filter((c) => isCommitmentExpectedOnDate(c, dateStr, mycStartedAt));
}

// ==========================================
// 3. Daily Consistency Score
// ==========================================

/**
 * Calculates the daily consistency summary for a specific calendar date.
 * If expected === 0:
 * - percentage is null
 * - isConsistent is null (unscheduled day, neither consistent nor inconsistent)
 */
export function calculateDailySummary(
  dateStr: string,
  expectedCommitments: Commitment[],
  completedCommitmentIds: Set<string> | string[],
): DailyConsistencySummary {
  const completedSet =
    completedCommitmentIds instanceof Set
      ? completedCommitmentIds
      : new Set(completedCommitmentIds);

  const expected = expectedCommitments.length;
  let completed = 0;

  for (const c of expectedCommitments) {
    if (completedSet.has(c.id)) {
      completed++;
    }
  }

  const percentage = expected > 0 ? Math.round((completed / expected) * 100) : null;
  const isConsistent = expected > 0 ? completed === expected : null;

  return {
    date: dateStr,
    expected,
    completed,
    percentage,
    isConsistent,
  };
}

// ==========================================
// 4. Streak Calculation Engine
// ==========================================

/**
 * Calculates the current streak of consistent days.
 *
 * Rules:
 * - If today has scheduled commitments and all are completed, today contributes to the streak.
 * - If today has scheduled commitments and some are incomplete, the current streak continues from
 *   yesterday's completed run (does not count today prematurely, but does not break the streak yet).
 * - If today has no scheduled commitments, it does not extend or break the streak.
 * - Unscheduled past days (expected === 0) neither break nor extend the streak.
 * - An incomplete past scheduled day immediately breaks the streak.
 * - If no valid consistent day exists, current streak is 0.
 */
export function calculateCurrentStreak(
  datesAscending: string[],
  summariesByDate: Map<string, DailyConsistencySummary>,
  todayDate: string,
): number {
  if (datesAscending.length === 0) {
    return 0;
  }

  const todaySummary = summariesByDate.get(todayDate);
  let streak = 0;

  // Evaluate today
  if (todaySummary && todaySummary.expected > 0 && todaySummary.isConsistent === true) {
    streak = 1;
  }

  // Walk backwards through past dates strictly before today
  const pastDatesDescending = datesAscending.filter((d) => d < todayDate).reverse();

  for (const date of pastDatesDescending) {
    const summary = summariesByDate.get(date);
    if (!summary || summary.expected === 0) {
      // Unscheduled day: does not break or extend the streak
      continue;
    }

    if (summary.isConsistent === true) {
      streak++;
    } else {
      // Incomplete past scheduled day breaks the streak
      break;
    }
  }

  return streak;
}

/**
 * Calculates the best (longest) streak of consecutive consistent days in the given date range.
 *
 * Rules:
 * - Unscheduled days (expected === 0) neither break nor extend the streak.
 * - An incomplete scheduled day (expected > 0 and completed < expected) breaks the running streak.
 */
export function calculateBestStreak(
  datesAscending: string[],
  summariesByDate: Map<string, DailyConsistencySummary>,
): number {
  let bestStreak = 0;
  let runningStreak = 0;

  for (const date of datesAscending) {
    const summary = summariesByDate.get(date);
    if (!summary || summary.expected === 0) {
      // Unscheduled day: neither breaks nor extends
      continue;
    }

    if (summary.isConsistent === true) {
      runningStreak++;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  return bestStreak;
}

// ==========================================
// 5. Overall Consistency Analytics
// ==========================================

export interface ComputeConsistencyOptions {
  commitments: Commitment[];
  completions: DailyCompletion[];
  timezone: string;
  mycStartedAt: string | null;
  targetDate?: string;
}

/**
 * Centrally computes all Consistency Metrics from actual database records.
 *
 * If the user's journey has not started (mycStartedAt is null):
 * Returns journeyStarted: false with zeroed metrics and null percentages.
 */
export function calculateConsistencyMetrics({
  commitments,
  completions,
  timezone,
  mycStartedAt,
  targetDate,
}: ComputeConsistencyOptions): ConsistencyMetrics {
  const todayDate = targetDate || getUserLocalDateString(timezone);

  // If journey not started or target date is before journey start
  if (!mycStartedAt || todayDate < mycStartedAt) {
    const todayExpected = mycStartedAt
      ? getExpectedCommitmentsForDate(commitments, todayDate, mycStartedAt)
      : [];
    const todaySummary: DailyConsistencySummary = {
      date: todayDate,
      expected: todayExpected.length,
      completed: 0,
      percentage: null,
      isConsistent: null,
    };

    return {
      currentStreak: 0,
      bestStreak: 0,
      consistentDays: 0,
      overallPercentage: null,
      today: todaySummary,
      journeyStarted: Boolean(mycStartedAt),
      mycStartedAt,
      totalExpectedCommitmentDays: 0,
      totalCompletedCommitmentDays: 0,
    };
  }

  // Get all calendar dates from journey start to today (inclusive)
  const allDates = getDateRange(mycStartedAt, todayDate);

  // Map completions by date -> Set of completed commitment IDs
  const completionsByDate = new Map<string, Set<string>>();
  for (const comp of completions) {
    if (comp.date >= mycStartedAt && comp.date <= todayDate) {
      let set = completionsByDate.get(comp.date);
      if (!set) {
        set = new Set<string>();
        completionsByDate.set(comp.date, set);
      }
      set.add(comp.commitment_id);
    }
  }

  // Calculate daily summary for each date in range
  const summariesByDate = new Map<string, DailyConsistencySummary>();
  let consistentDays = 0;
  let totalExpected = 0;
  let totalCompleted = 0;

  for (const date of allDates) {
    const expectedForDate = getExpectedCommitmentsForDate(commitments, date, mycStartedAt);
    const completedSet = completionsByDate.get(date) || new Set<string>();
    const summary = calculateDailySummary(date, expectedForDate, completedSet);
    summariesByDate.set(date, summary);

    if (summary.expected > 0) {
      totalExpected += summary.expected;
      totalCompleted += summary.completed;
      if (summary.isConsistent === true) {
        consistentDays++;
      }
    }
  }

  const overallPercentage =
    totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : null;

  const currentStreak = calculateCurrentStreak(allDates, summariesByDate, todayDate);
  const bestStreak = calculateBestStreak(allDates, summariesByDate);

  const todaySummary = summariesByDate.get(todayDate) || {
    date: todayDate,
    expected: 0,
    completed: 0,
    percentage: null,
    isConsistent: null,
  };

  return {
    currentStreak,
    bestStreak,
    consistentDays,
    overallPercentage,
    today: todaySummary,
    journeyStarted: true,
    mycStartedAt,
    totalExpectedCommitmentDays: totalExpected,
    totalCompletedCommitmentDays: totalCompleted,
  };
}

// ==========================================
// 6. Centralized Database Operations
// ==========================================

export interface CompleteCommitmentResult {
  data: DailyCompletion | null;
  error: string | null;
}

export interface UncompleteCommitmentResult {
  success: boolean;
  error: string | null;
}

export interface DailyCommitmentsResult {
  items: DailyCommitmentItem[];
  summary: DailyConsistencySummary;
  date: string;
  error: string | null;
}

export interface DashboardConsistencyData {
  metrics: ConsistencyMetrics;
  todayItems: DailyCommitmentItem[];
  profile: Profile | null;
  error: string | null;
}

/**
 * Marks a commitment complete on the target date (idempotent).
 */
export async function completeCommitment(
  supabase: SupabaseClient<Database>,
  commitmentId: string,
  date?: string,
): Promise<CompleteCommitmentResult> {
  const { data, error } = await supabase.rpc("complete_commitment", {
    p_commitment_id: commitmentId,
    p_date: date || undefined,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as DailyCompletion, error: null };
}

/**
 * Reverses/removes a completion for the target date (idempotent).
 */
export async function uncompleteCommitment(
  supabase: SupabaseClient<Database>,
  commitmentId: string,
  date?: string,
): Promise<UncompleteCommitmentResult> {
  const { error } = await supabase.rpc("uncomplete_commitment", {
    p_commitment_id: commitmentId,
    p_date: date || undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Fetches today's (or a specified date's) scheduled commitments along with their completion status.
 */
export async function getDailyCommitments(
  supabase: SupabaseClient<Database>,
  targetDate?: string,
): Promise<DailyCommitmentsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      items: [],
      summary: {
        date: targetDate || new Date().toISOString().slice(0, 10),
        expected: 0,
        completed: 0,
        percentage: null,
        isConsistent: null,
      },
      date: targetDate || new Date().toISOString().slice(0, 10),
      error: "Not authenticated",
    };
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const localDate = targetDate || getUserLocalDateString(profile?.timezone || undefined);

  // Fetch active commitments
  const { data: commitmentsData, error: commitmentsError } = await supabase
    .from("commitments")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (commitmentsError) {
    return {
      items: [],
      summary: {
        date: localDate,
        expected: 0,
        completed: 0,
        percentage: null,
        isConsistent: null,
      },
      date: localDate,
      error: commitmentsError.message,
    };
  }

  const allActive = (commitmentsData as Commitment[]) || [];
  const expected = getExpectedCommitmentsForDate(allActive, localDate, profile?.myc_started_at);

  // Fetch completions for this date
  const { data: completionsData, error: completionsError } = await supabase
    .from("daily_completions")
    .select("*")
    .eq("date", localDate);

  if (completionsError) {
    return {
      items: [],
      summary: {
        date: localDate,
        expected: expected.length,
        completed: 0,
        percentage: null,
        isConsistent: null,
      },
      date: localDate,
      error: completionsError.message,
    };
  }

  const completions = (completionsData as DailyCompletion[]) || [];
  const completedMap = new Map<string, DailyCompletion>();
  for (const c of completions) {
    completedMap.set(c.commitment_id, c);
  }

  const items: DailyCommitmentItem[] = expected.map((commitment) => {
    const comp = completedMap.get(commitment.id);
    return {
      commitment,
      isCompleted: Boolean(comp),
      completedAt: comp?.completed_at || null,
    };
  });

  const summary = calculateDailySummary(
    localDate,
    expected,
    new Set(completions.map((c) => c.commitment_id)),
  );

  return {
    items,
    summary,
    date: localDate,
    error: null,
  };
}

/**
 * Fetches full consistency metrics and today's items for the user dashboard.
 */
export async function getDashboardConsistencyData(
  supabase: SupabaseClient<Database>,
  targetDate?: string,
): Promise<DashboardConsistencyData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const fallbackDate = targetDate || new Date().toISOString().slice(0, 10);
    return {
      metrics: {
        currentStreak: 0,
        bestStreak: 0,
        consistentDays: 0,
        overallPercentage: null,
        today: {
          date: fallbackDate,
          expected: 0,
          completed: 0,
          percentage: null,
          isConsistent: null,
        },
        journeyStarted: false,
        mycStartedAt: null,
        totalExpectedCommitmentDays: 0,
        totalCompletedCommitmentDays: 0,
      },
      todayItems: [],
      profile: null,
      error: "Not authenticated",
    };
  }

  // 1. Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "UTC";
  const todayDate = targetDate || getUserLocalDateString(timezone);

  // 2. Fetch all commitments
  const { data: commitmentsData, error: commitmentsError } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: true });

  if (commitmentsError) {
    return {
      metrics: {
        currentStreak: 0,
        bestStreak: 0,
        consistentDays: 0,
        overallPercentage: null,
        today: {
          date: todayDate,
          expected: 0,
          completed: 0,
          percentage: null,
          isConsistent: null,
        },
        journeyStarted: Boolean(profile?.myc_started_at),
        mycStartedAt: profile?.myc_started_at || null,
        totalExpectedCommitmentDays: 0,
        totalCompletedCommitmentDays: 0,
      },
      todayItems: [],
      profile: profile as Profile | null,
      error: commitmentsError.message,
    };
  }

  const commitments = (commitmentsData as Commitment[]) || [];

  // 3. If journey started, fetch completions from myc_started_at to todayDate
  let completions: DailyCompletion[] = [];
  if (profile?.myc_started_at && profile.myc_started_at <= todayDate) {
    const { data: compsData } = await supabase
      .from("daily_completions")
      .select("*")
      .gte("date", profile.myc_started_at)
      .lte("date", todayDate);

    if (compsData) {
      completions = compsData as DailyCompletion[];
    }
  }

  // 4. Calculate metrics
  const metrics = calculateConsistencyMetrics({
    commitments,
    completions,
    timezone,
    mycStartedAt: profile?.myc_started_at || null,
    targetDate: todayDate,
  });

  // 5. Build today's items
  const expectedToday = getExpectedCommitmentsForDate(
    commitments,
    todayDate,
    profile?.myc_started_at,
  );
  const todayCompletions = completions.filter((c) => c.date === todayDate);
  const todayCompletedMap = new Map<string, DailyCompletion>();
  for (const c of todayCompletions) {
    todayCompletedMap.set(c.commitment_id, c);
  }

  const todayItems: DailyCommitmentItem[] = expectedToday.map((commitment) => {
    const comp = todayCompletedMap.get(commitment.id);
    return {
      commitment,
      isCompleted: Boolean(comp),
      completedAt: comp?.completed_at || null,
    };
  });

  return {
    metrics,
    todayItems,
    profile: profile as Profile | null,
    error: null,
  };
}
