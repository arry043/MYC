import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AnalyticsChartPoint,
  AnalyticsPageData,
  AnalyticsReportingPeriod,
  CalendarDayData,
  CalendarPageData,
  CalendarView,
  Commitment,
  CommitmentPerformance,
  CompletionHistoryEntry,
  ConsistencyIntensityLevel,
  ConsistencyMetrics,
  DailyCommitmentItem,
  DailyCompletion,
  DailyConsistencySummary,
  Database,
  PeriodSummary,
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

/**
 * Calculates the intensity level (0..4) for a calendar cell based on consistency percentage.
 */
export function getIntensityLevel(
  expected: number,
  completed: number,
  percentage: number | null,
): ConsistencyIntensityLevel {
  if (expected === 0) {
    return 0; // No expected commitments
  }
  if (completed === 0) {
    return 1; // Expected, but none completed
  }
  if (percentage !== null && percentage <= 50) {
    return 2; // 1%..50%
  }
  if (percentage !== null && percentage < 100) {
    return 3; // 51%..99%
  }
  return 4; // 100% completed (fully consistent day)
}

export const INTENSITY_LEVEL_CLASSES: Record<ConsistencyIntensityLevel, string> = {
  0: "bg-track/50 border border-border/40 text-muted-foreground/60",
  1: "bg-track text-foreground/75",
  2: "bg-sky-1 text-foreground/80",
  3: "bg-sky-2 text-foreground/90",
  4: "bg-sky-4 text-white",
};

export const INTENSITY_LEVEL_TEXT: Record<ConsistencyIntensityLevel, string> = {
  0: "No commitments scheduled",
  1: "0% completed",
  2: "1%–50% completed",
  3: "51%–99% completed",
  4: "100% completed — consistent day",
};

export function getYearDateRange(year: number): { startDate: string; endDate: string } {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function getMonthDateRange(
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${year}-${m}-01`,
    endDate: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getWeekDateRange(dateStr: string): { startDate: string; endDate: string } {
  const dow = getIsoWeekday(dateStr); // 1 = Monday ... 7 = Sunday
  const monday = addDays(dateStr, -(dow - 1));
  const sunday = addDays(monday, 6);
  return {
    startDate: monday,
    endDate: sunday,
  };
}

export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
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

  if (commitment.frequency === "single_day") {
    const targetDate = commitment.scheduled_date || commitment.start_date;
    return dateStr === targetDate;
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

/**
 * Calculates daily consistency summary respecting a commitment filter ('all' or specific commitment id).
 * For an individual commitment:
 * - If not scheduled on that date: expected = 0, completed = 0, percentage = null, isConsistent = null.
 * - If scheduled on that date: expected = 1, completed = 1 (if done) or 0 (if not), percentage = 100 or 0.
 */
export function calculateFilteredDailySummary(
  dateStr: string,
  commitments: Commitment[],
  completedSet: Set<string>,
  filterCommitmentId: string | "all" = "all",
  mycStartedAt?: string | null,
): DailyConsistencySummary {
  if (filterCommitmentId === "all") {
    const expected = getExpectedCommitmentsForDate(commitments, dateStr, mycStartedAt);
    return calculateDailySummary(dateStr, expected, completedSet);
  }

  const commitment = commitments.find((c) => c.id === filterCommitmentId);
  if (!commitment || !isCommitmentExpectedOnDate(commitment, dateStr, mycStartedAt)) {
    return {
      date: dateStr,
      expected: 0,
      completed: 0,
      percentage: null,
      isConsistent: null,
    };
  }

  const isCompleted = completedSet.has(commitment.id);
  return {
    date: dateStr,
    expected: 1,
    completed: isCompleted ? 1 : 0,
    percentage: isCompleted ? 100 : 0,
    isConsistent: isCompleted,
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

/**
 * Calculates consistency summary for a specific date range, taking into account
 * journey start date, today date, and commitment filter.
 */
export function calculatePeriodSummary(
  startDate: string,
  endDate: string,
  commitments: Commitment[],
  completions: DailyCompletion[],
  filterCommitmentId: string | "all" = "all",
  mycStartedAt?: string | null,
  todayDate?: string,
): PeriodSummary {
  if (!mycStartedAt || (todayDate && startDate > todayDate)) {
    return {
      startDate,
      endDate,
      consistentDays: 0,
      totalEligibleInstances: 0,
      totalCompletedInstances: 0,
      completionPercentage: null,
    };
  }

  const effectiveStart = startDate < mycStartedAt ? mycStartedAt : startDate;
  const effectiveEnd = todayDate && endDate > todayDate ? todayDate : endDate;

  if (effectiveStart > effectiveEnd) {
    return {
      startDate,
      endDate,
      consistentDays: 0,
      totalEligibleInstances: 0,
      totalCompletedInstances: 0,
      completionPercentage: null,
    };
  }

  const completionsByDate = new Map<string, Set<string>>();
  for (const comp of completions) {
    if (comp.date >= effectiveStart && comp.date <= effectiveEnd) {
      let set = completionsByDate.get(comp.date);
      if (!set) {
        set = new Set<string>();
        completionsByDate.set(comp.date, set);
      }
      set.add(comp.commitment_id);
    }
  }

  const dates = getDateRange(effectiveStart, effectiveEnd);
  let consistentDays = 0;
  let totalEligibleInstances = 0;
  let totalCompletedInstances = 0;

  for (const date of dates) {
    const completedSet = completionsByDate.get(date) || new Set<string>();
    const summary = calculateFilteredDailySummary(
      date,
      commitments,
      completedSet,
      filterCommitmentId,
      mycStartedAt,
    );

    if (summary.expected > 0) {
      totalEligibleInstances += summary.expected;
      totalCompletedInstances += summary.completed;
      if (summary.isConsistent === true) {
        consistentDays++;
      }
    }
  }

  const completionPercentage =
    totalEligibleInstances > 0
      ? Math.round((totalCompletedInstances / totalEligibleInstances) * 100)
      : null;

  return {
    startDate,
    endDate,
    consistentDays,
    totalEligibleInstances,
    totalCompletedInstances,
    completionPercentage,
  };
}

/**
 * Calculates performance comparison for each commitment over a given date range.
 */
export function calculateCommitmentPerformances(
  commitments: Commitment[],
  completions: DailyCompletion[],
  startDate: string,
  endDate: string,
  mycStartedAt?: string | null,
  todayDate?: string,
): CommitmentPerformance[] {
  if (!mycStartedAt || (todayDate && startDate > todayDate)) {
    return commitments.map((c) => ({
      commitment: c,
      expectedInstances: 0,
      completedInstances: 0,
      percentage: null,
    }));
  }

  const effectiveStart = startDate < mycStartedAt ? mycStartedAt : startDate;
  const effectiveEnd = todayDate && endDate > todayDate ? todayDate : endDate;

  if (effectiveStart > effectiveEnd) {
    return commitments.map((c) => ({
      commitment: c,
      expectedInstances: 0,
      completedInstances: 0,
      percentage: null,
    }));
  }

  const dates = getDateRange(effectiveStart, effectiveEnd);

  const completionsByDate = new Map<string, Set<string>>();
  for (const comp of completions) {
    if (comp.date >= effectiveStart && comp.date <= effectiveEnd) {
      let set = completionsByDate.get(comp.date);
      if (!set) {
        set = new Set<string>();
        completionsByDate.set(comp.date, set);
      }
      set.add(comp.commitment_id);
    }
  }

  return commitments.map((commitment) => {
    let expectedInstances = 0;
    let completedInstances = 0;

    for (const date of dates) {
      if (isCommitmentExpectedOnDate(commitment, date, mycStartedAt)) {
        expectedInstances++;
        const completedSet = completionsByDate.get(date);
        if (completedSet && completedSet.has(commitment.id)) {
          completedInstances++;
        }
      }
    }

    const percentage =
      expectedInstances > 0 ? Math.round((completedInstances / expectedInstances) * 100) : null;

    return {
      commitment,
      expectedInstances,
      completedInstances,
      percentage,
    };
  });
}

// ==========================================
// 6. Centralized Database Operations
// ==========================================

export interface CompleteCommitmentInput {
  commitmentId: string;
  date?: string;
  comment?: string | null;
}

export interface CompleteCommitmentResult {
  data: DailyCompletion | null;
  error: string | null;
}

export interface UncompleteCommitmentResult {
  success: boolean;
  error: string | null;
}

export interface HistoryQueryOptions {
  commitmentId?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export interface CompletionHistoryResult {
  entries: CompletionHistoryEntry[];
  totalCount: number;
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
 * Permanently marks a commitment complete on the target date with an optional comment (idempotent).
 */
export async function completeCommitment(
  supabase: SupabaseClient<Database>,
  inputOrCommitmentId: CompleteCommitmentInput | string,
  maybeDate?: string,
  maybeComment?: string | null,
): Promise<CompleteCommitmentResult> {
  const commitmentId =
    typeof inputOrCommitmentId === "string"
      ? inputOrCommitmentId
      : inputOrCommitmentId.commitmentId;
  const date = typeof inputOrCommitmentId === "string" ? maybeDate : inputOrCommitmentId.date;
  const rawComment =
    typeof inputOrCommitmentId === "string" ? maybeComment : inputOrCommitmentId.comment;

  const trimmedComment = rawComment?.trim() ? rawComment.trim() : null;

  if (trimmedComment && trimmedComment.length > 1000) {
    return { data: null, error: "Comment must be 1,000 characters or fewer." };
  }

  const { data, error } = await supabase.rpc("complete_commitment", {
    p_commitment_id: commitmentId,
    p_date: date || undefined,
    p_comment: trimmedComment || undefined,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as DailyCompletion, error: null };
}

/**
 * @deprecated In MYC, commitment completions are permanent historical records of work performed and cannot be undone.
 */
export async function uncompleteCommitment(
  _supabase?: SupabaseClient<Database>,
  _commitmentId?: string,
  _date?: string,
): Promise<UncompleteCommitmentResult> {
  return {
    success: false,
    error: "Completions are permanent and cannot be undone or reverted.",
  };
}

/**
 * Fetches completion history for a user, optionally filtered by commitment ID or date.
 * Sorted newest first by completed_at timestamp.
 */
export async function getCompletionHistory(
  supabase: SupabaseClient<Database>,
  options: HistoryQueryOptions = {},
): Promise<CompletionHistoryResult> {
  let query = supabase
    .from("daily_completions")
    .select("id, commitment_id, date, completed_at, comment", { count: "exact" })
    .order("completed_at", { ascending: false });

  if (options.commitmentId) {
    query = query.eq("commitment_id", options.commitmentId);
  }
  if (options.date) {
    query = query.eq("date", options.date);
  }
  if (options.limit) {
    const from = options.offset || 0;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data: completions, count, error: compsError } = await query;

  if (compsError) {
    return { entries: [], totalCount: 0, error: compsError.message };
  }

  const { data: commitmentsData, error: commsError } = await supabase
    .from("commitments")
    .select("id, title, description");

  if (commsError) {
    return { entries: [], totalCount: 0, error: commsError.message };
  }

  const commMap = new Map((commitmentsData || []).map((c) => [c.id, c]));

  const entries: CompletionHistoryEntry[] = (completions || []).map((comp) => {
    const commitment = commMap.get(comp.commitment_id);
    return {
      id: comp.id,
      commitmentId: comp.commitment_id,
      commitmentTitle: commitment?.title || "Commitment",
      commitmentDescription: commitment?.description || null,
      date: comp.date,
      completedAt: comp.completed_at,
      comment: comp.comment,
    };
  });

  return {
    entries,
    totalCount: count ?? entries.length,
    error: null,
  };
}

/**
 * Formats a UTC ISO completion timestamp into the user's local timezone (e.g., "Saturday, October 17, 2026 · 10:42 AM").
 */
export function formatCompletionTimestamp(isoTimestamp: string, timezone: string = "UTC"): string {
  try {
    const date = new Date(isoTimestamp);
    const datePart = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);

    const timePart = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    return `${datePart} · ${timePart}`;
  } catch {
    return isoTimestamp;
  }
}

/**
 * Formats a UTC ISO completion timestamp into local time only (e.g., "10:42 AM").
 */
export function formatCompletionTimeOnly(isoTimestamp: string, timezone: string = "UTC"): string {
  try {
    const date = new Date(isoTimestamp);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoTimestamp;
  }
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
      comment: comp?.comment || null,
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
      comment: comp?.comment || null,
    };
  });

  return {
    metrics,
    todayItems,
    profile: profile as Profile | null,
    error: null,
  };
}

export interface CalendarQueryOptions {
  view?: CalendarView;
  date?: string;
  year?: number;
  month?: number;
  filterCommitmentId?: string | "all";
}

/**
 * Fetches comprehensive calendar data for Year, Month, Week, or Day views in a single query batch.
 */
export async function getCalendarData(
  supabase: SupabaseClient<Database>,
  options: CalendarQueryOptions = {},
): Promise<CalendarPageData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  if (!user) {
    const todayFallback = now.toISOString().slice(0, 10);
    return {
      profile: null,
      commitments: [],
      mycStartedAt: null,
      todayDate: todayFallback,
      selectedDate: options.date || todayFallback,
      selectedYear: options.year || currentYear,
      selectedMonth: options.month || currentMonth,
      view: options.view || "day",
      filterCommitmentId: options.filterCommitmentId || "all",
      days: [],
      periodSummary: {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        consistentDays: 0,
        totalEligibleInstances: 0,
        totalCompletedInstances: 0,
        completionPercentage: null,
      },
      error: "Not authenticated",
    };
  }

  // 1. Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "UTC";
  const todayDate = getUserLocalDateString(timezone);
  const mycStartedAt = profile?.myc_started_at || null;

  const todayParts = todayDate.split("-").map(Number);
  const userTodayYear = todayParts[0] ?? currentYear;
  const userTodayMonth = todayParts[1] ?? currentMonth;

  const view = options.view || "day";
  const filterCommitmentId = options.filterCommitmentId || "all";
  const selectedDate = options.date || todayDate;
  const selectedYear =
    options.year || (options.date ? Number(options.date.slice(0, 4)) : userTodayYear);
  const selectedMonth =
    options.month || (options.date ? Number(options.date.slice(5, 7)) : userTodayMonth);

  // 2. Commitments
  const { data: commitmentsData, error: commitmentsError } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: true });

  if (commitmentsError) {
    return {
      profile: profile as Profile | null,
      commitments: [],
      mycStartedAt,
      todayDate,
      selectedDate,
      selectedYear,
      selectedMonth,
      view,
      filterCommitmentId,
      days: [],
      periodSummary: {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        consistentDays: 0,
        totalEligibleInstances: 0,
        totalCompletedInstances: 0,
        completionPercentage: null,
      },
      error: commitmentsError.message,
    };
  }

  const commitments = (commitmentsData as Commitment[]) || [];

  // Determine query range based on requested view
  let rangeStart: string;
  let rangeEnd: string;

  if (view === "year") {
    const yearRange = getYearDateRange(selectedYear);
    rangeStart = yearRange.startDate;
    rangeEnd = yearRange.endDate;
  } else if (view === "month") {
    const monthRange = getMonthDateRange(selectedYear, selectedMonth);
    rangeStart = monthRange.startDate;
    rangeEnd = monthRange.endDate;
  } else if (view === "week") {
    const weekRange = getWeekDateRange(selectedDate);
    rangeStart = weekRange.startDate;
    rangeEnd = weekRange.endDate;
  } else {
    // view === 'day'
    rangeStart = selectedDate;
    rangeEnd = selectedDate;
  }

  // 3. Completions for range (only if journey has started)
  let completions: DailyCompletion[] = [];
  if (mycStartedAt && mycStartedAt <= rangeEnd) {
    const queryStart = rangeStart < mycStartedAt ? mycStartedAt : rangeStart;
    const queryEnd = rangeEnd > todayDate ? todayDate : rangeEnd;
    if (queryStart <= queryEnd) {
      const { data: compsData } = await supabase
        .from("daily_completions")
        .select("*")
        .gte("date", queryStart)
        .lte("date", queryEnd);
      if (compsData) {
        completions = compsData as DailyCompletion[];
      }
    }
  }

  // Index completions by date
  const completionsByDate = new Map<string, Set<string>>();
  const completionsListByDate = new Map<string, DailyCompletion[]>();
  for (const comp of completions) {
    let set = completionsByDate.get(comp.date);
    if (!set) {
      set = new Set<string>();
      completionsByDate.set(comp.date, set);
    }
    set.add(comp.commitment_id);

    let list = completionsListByDate.get(comp.date);
    if (!list) {
      list = [];
      completionsListByDate.set(comp.date, list);
    }
    list.push(comp);
  }

  // 4. Build CalendarDayData for each date in range
  const allDatesInRange = getDateRange(rangeStart, rangeEnd);
  const days: CalendarDayData[] = allDatesInRange.map((d) => {
    const parts = d.split("-").map(Number);
    const yr = parts[0] ?? selectedYear;
    const mo = parts[1] ?? selectedMonth;
    const dayOfMonth = parts[2] ?? 1;
    const isoWeekday = getIsoWeekday(d);
    const isToday = d === todayDate;
    const isFuture = d > todayDate;
    const isPreJourney = Boolean(mycStartedAt && d < mycStartedAt);

    if (isFuture || isPreJourney || !mycStartedAt) {
      let items: DailyCommitmentItem[] | undefined;
      if (isFuture && (view === "day" || view === "week")) {
        const scheduledCommitments =
          filterCommitmentId === "all"
            ? commitments.filter(
                (c) =>
                  c.status === "active" &&
                  (c.frequency === "single_day"
                    ? (c.scheduled_date || c.start_date) === d
                    : isCommitmentExpectedOnDate(c, d, mycStartedAt || d)),
              )
            : commitments.filter(
                (c) =>
                  c.id === filterCommitmentId &&
                  c.status === "active" &&
                  (c.frequency === "single_day"
                    ? (c.scheduled_date || c.start_date) === d
                    : isCommitmentExpectedOnDate(c, d, mycStartedAt || d)),
              );

        items = scheduledCommitments.map((c) => ({
          commitment: c,
          isCompleted: false,
          completedAt: null,
          comment: null,
        }));
      }

      return {
        date: d,
        dayOfMonth,
        month: mo,
        year: yr,
        isoWeekday,
        isToday,
        isFuture,
        isPreJourney,
        expected: items ? items.length : 0,
        completed: 0,
        percentage: null,
        isConsistent: null,
        intensity: 0,
        items,
      };
    }

    const completedSet = completionsByDate.get(d) || new Set<string>();
    const summary = calculateFilteredDailySummary(
      d,
      commitments,
      completedSet,
      filterCommitmentId,
      mycStartedAt,
    );

    const intensity = getIntensityLevel(summary.expected, summary.completed, summary.percentage);

    // Build items for Day view and Week view
    let items: DailyCommitmentItem[] | undefined;
    if (view === "day" || view === "week") {
      const expectedCommitments =
        filterCommitmentId === "all"
          ? getExpectedCommitmentsForDate(commitments, d, mycStartedAt)
          : commitments.filter(
              (c) => c.id === filterCommitmentId && isCommitmentExpectedOnDate(c, d, mycStartedAt),
            );
      const dayCompletions = completionsListByDate.get(d) || [];
      const compMap = new Map(dayCompletions.map((c) => [c.commitment_id, c]));
      items = expectedCommitments.map((c) => {
        const comp = compMap.get(c.id);
        return {
          commitment: c,
          isCompleted: Boolean(comp),
          completedAt: comp?.completed_at || null,
          comment: comp?.comment || null,
        };
      });
    }

    return {
      date: d,
      dayOfMonth,
      month: mo,
      year: yr,
      isoWeekday,
      isToday,
      isFuture,
      isPreJourney,
      expected: summary.expected,
      completed: summary.completed,
      percentage: summary.percentage,
      isConsistent: summary.isConsistent,
      intensity,
      items,
    };
  });

  // 5. Calculate period summary
  const periodSummary = calculatePeriodSummary(
    rangeStart,
    rangeEnd,
    commitments,
    completions,
    filterCommitmentId,
    mycStartedAt,
    todayDate,
  );

  return {
    profile: profile as Profile | null,
    commitments,
    mycStartedAt,
    todayDate,
    selectedDate,
    selectedYear,
    selectedMonth,
    view,
    filterCommitmentId,
    days,
    periodSummary,
    error: null,
  };
}

export interface AnalyticsQueryOptions {
  reportingPeriod?: AnalyticsReportingPeriod;
  filterCommitmentId?: string | "all";
  selectedMonth?: number;
  selectedYear?: number;
}

/**
 * Fetches complete analytics data for streaks, cards, weekly/monthly charts, and commitment performance.
 */
export async function getAnalyticsData(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions = {},
): Promise<AnalyticsPageData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const todayFallback = now.toISOString().slice(0, 10);

  if (!user) {
    return {
      profile: null,
      commitments: [],
      mycStartedAt: null,
      todayDate: todayFallback,
      metrics: {
        currentStreak: 0,
        bestStreak: 0,
        consistentDays: 0,
        overallPercentage: null,
        today: {
          date: todayFallback,
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
      periodSummary: {
        startDate: todayFallback,
        endDate: todayFallback,
        consistentDays: 0,
        totalEligibleInstances: 0,
        totalCompletedInstances: 0,
        completionPercentage: null,
      },
      weeklyChart: { points: [], label: "Weekly consistency" },
      monthlyChart: {
        points: [],
        label: "Monthly consistency",
        year: currentYear,
        month: currentMonth,
      },
      commitmentPerformances: [],
      reportingPeriod: options.reportingPeriod || "7d",
      error: "Not authenticated",
    };
  }

  // 1. Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "UTC";
  const todayDate = getUserLocalDateString(timezone);
  const mycStartedAt = profile?.myc_started_at || null;

  const todayParts = todayDate.split("-").map(Number);
  const userTodayYear = todayParts[0] ?? currentYear;
  const userTodayMonth = todayParts[1] ?? currentMonth;

  const reportingPeriod = options.reportingPeriod || "7d";
  const filterCommitmentId = options.filterCommitmentId || "all";
  const selectedYear = options.selectedYear || userTodayYear;
  const selectedMonth = options.selectedMonth || userTodayMonth;

  // 2. Commitments
  const { data: commitmentsData, error: commitmentsError } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: true });

  if (commitmentsError) {
    return {
      profile: profile as Profile | null,
      commitments: [],
      mycStartedAt,
      todayDate,
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
        journeyStarted: Boolean(mycStartedAt),
        mycStartedAt,
        totalExpectedCommitmentDays: 0,
        totalCompletedCommitmentDays: 0,
      },
      periodSummary: {
        startDate: todayDate,
        endDate: todayDate,
        consistentDays: 0,
        totalEligibleInstances: 0,
        totalCompletedInstances: 0,
        completionPercentage: null,
      },
      weeklyChart: { points: [], label: "Weekly consistency" },
      monthlyChart: {
        points: [],
        label: "Monthly consistency",
        year: selectedYear,
        month: selectedMonth,
      },
      commitmentPerformances: [],
      reportingPeriod,
      error: commitmentsError.message,
    };
  }

  const commitments = (commitmentsData as Commitment[]) || [];

  // 3. Completions from journey start to todayDate
  let completions: DailyCompletion[] = [];
  if (mycStartedAt && mycStartedAt <= todayDate) {
    const { data: compsData } = await supabase
      .from("daily_completions")
      .select("*")
      .gte("date", mycStartedAt)
      .lte("date", todayDate);
    if (compsData) {
      completions = compsData as DailyCompletion[];
    }
  }

  // 4. Lifetime metrics
  const metrics = calculateConsistencyMetrics({
    commitments,
    completions,
    timezone,
    mycStartedAt,
    targetDate: todayDate,
  });

  // 5. Determine reporting period date range
  let periodStart: string;
  let periodEnd: string;

  if (reportingPeriod === "7d") {
    periodStart = addDays(todayDate, -6);
    periodEnd = todayDate;
  } else if (reportingPeriod === "30d") {
    periodStart = addDays(todayDate, -29);
    periodEnd = todayDate;
  } else if (reportingPeriod === "year") {
    const yRange = getYearDateRange(selectedYear);
    periodStart = yRange.startDate;
    periodEnd = yRange.endDate;
  } else {
    // "all"
    periodStart = mycStartedAt || todayDate;
    periodEnd = todayDate;
  }

  const periodSummary = calculatePeriodSummary(
    periodStart,
    periodEnd,
    commitments,
    completions,
    filterCommitmentId,
    mycStartedAt,
    todayDate,
  );

  // 6. Build Weekly Chart (Last 7 days ending today)
  const last7Days = getDateRange(addDays(todayDate, -6), todayDate);
  const completionsByDate = new Map<string, Set<string>>();
  for (const c of completions) {
    let s = completionsByDate.get(c.date);
    if (!s) {
      s = new Set<string>();
      completionsByDate.set(c.date, s);
    }
    s.add(c.commitment_id);
  }

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyPoints: AnalyticsChartPoint[] = last7Days.map((d) => {
    const dow = getIsoWeekday(d);
    const completedSet = completionsByDate.get(d) || new Set<string>();
    const isPre = Boolean(mycStartedAt && d < mycStartedAt);
    if (isPre || !mycStartedAt) {
      return {
        date: d,
        label: weekdayNames[dow - 1] ?? "Day",
        sublabel: d.slice(5),
        percentage: null,
        completed: 0,
        expected: 0,
        isConsistent: null,
      };
    }
    const summary = calculateFilteredDailySummary(
      d,
      commitments,
      completedSet,
      filterCommitmentId,
      mycStartedAt,
    );
    return {
      date: d,
      label: weekdayNames[dow - 1] ?? "Day",
      sublabel: d.slice(5),
      percentage: summary.percentage,
      completed: summary.completed,
      expected: summary.expected,
      isConsistent: summary.isConsistent,
    };
  });

  // 7. Build Monthly Chart (Days of selected month)
  const monthRange = getMonthDateRange(selectedYear, selectedMonth);
  const monthDates = getDateRange(monthRange.startDate, monthRange.endDate);
  const monthlyPoints: AnalyticsChartPoint[] = monthDates.map((d) => {
    const dayNum = Number(d.slice(8));
    const isFuture = d > todayDate;
    const isPre = Boolean(mycStartedAt && d < mycStartedAt);
    if (isFuture || isPre || !mycStartedAt) {
      return {
        date: d,
        label: String(dayNum),
        sublabel: d,
        percentage: null,
        completed: 0,
        expected: 0,
        isConsistent: null,
      };
    }
    const completedSet = completionsByDate.get(d) || new Set<string>();
    const summary = calculateFilteredDailySummary(
      d,
      commitments,
      completedSet,
      filterCommitmentId,
      mycStartedAt,
    );
    return {
      date: d,
      label: String(dayNum),
      sublabel: d,
      percentage: summary.percentage,
      completed: summary.completed,
      expected: summary.expected,
      isConsistent: summary.isConsistent,
    };
  });

  // 8. Commitment Performances for reporting period
  const commitmentPerformances = calculateCommitmentPerformances(
    commitments,
    completions,
    periodStart,
    periodEnd,
    mycStartedAt,
    todayDate,
  );

  return {
    profile: profile as Profile | null,
    commitments,
    mycStartedAt,
    todayDate,
    metrics,
    periodSummary,
    weeklyChart: {
      points: weeklyPoints,
      label: "Daily consistency (last 7 days)",
    },
    monthlyChart: {
      points: monthlyPoints,
      label: formatMonthYear(selectedYear, selectedMonth),
      year: selectedYear,
      month: selectedMonth,
    },
    commitmentPerformances,
    reportingPeriod,
    error: null,
  };
}
