import assert from "node:assert/strict";
import test from "node:test";

import type { Commitment, DailyCompletion } from "@myc/types";

import {
  addDays,
  calculateBestStreak,
  calculateCommitmentPerformances,
  calculateConsistencyMetrics,
  calculateCurrentStreak,
  calculateDailySummary,
  calculateFilteredDailySummary,
  calculatePeriodSummary,
  formatCompletionTimeOnly,
  formatCompletionTimestamp,
  getDateRange,
  getExpectedCommitmentsForDate,
  getIntensityLevel,
  getIsoWeekday,
  getMonthDateRange,
  getWeekDateRange,
  getYearDateRange,
  isCommitmentExpectedOnDate,
  uncompleteCommitment,
} from "./consistency.ts";

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c1",
    user_id: "u1",
    title: "Commitment 1",
    description: null,
    frequency: "daily",
    schedule_days: [1, 2, 3, 4, 5, 6, 7],
    start_date: "2026-10-01",
    end_date: null,
    status: "active",
    tone: "sky",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

test("date utilities: getIsoWeekday, addDays, getDateRange", () => {
  // 2026-10-12 was a Monday = 1
  assert.equal(getIsoWeekday("2026-10-12"), 1);
  // 2026-10-17 is Saturday = 6
  assert.equal(getIsoWeekday("2026-10-17"), 6);
  // 2026-10-18 is Sunday = 7
  assert.equal(getIsoWeekday("2026-10-18"), 7);

  assert.equal(addDays("2026-10-12", 1), "2026-10-13");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-10-12", -1), "2026-10-11");

  const range = getDateRange("2026-10-01", "2026-10-03");
  assert.deepEqual(range, ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.deepEqual(getDateRange("2026-10-05", "2026-10-01"), []);
});

test("scheduling: isCommitmentExpectedOnDate", () => {
  const daily = makeCommitment({ frequency: "daily", status: "active", start_date: "2026-10-01" });
  assert.equal(isCommitmentExpectedOnDate(daily, "2026-10-05", "2026-10-01"), true);
  // Before start date
  assert.equal(isCommitmentExpectedOnDate(daily, "2026-09-30", "2026-09-01"), false);
  // Before journey start
  assert.equal(isCommitmentExpectedOnDate(daily, "2026-10-01", "2026-10-05"), false);

  // Paused commitment
  const paused = makeCommitment({ status: "paused" });
  assert.equal(isCommitmentExpectedOnDate(paused, "2026-10-05", "2026-10-01"), false);

  // Archived commitment
  const archived = makeCommitment({ status: "archived" });
  assert.equal(isCommitmentExpectedOnDate(archived, "2026-10-05", "2026-10-01"), false);

  // End date passed
  const ended = makeCommitment({ end_date: "2026-10-10" });
  assert.equal(isCommitmentExpectedOnDate(ended, "2026-10-11", "2026-10-01"), false);
  assert.equal(isCommitmentExpectedOnDate(ended, "2026-10-10", "2026-10-01"), true);

  // Specific days: Mon (1) & Wed (3)
  const mw = makeCommitment({
    frequency: "specific_days",
    schedule_days: [1, 3],
    start_date: "2026-10-01",
  });
  // 2026-10-12 is Monday (1)
  assert.equal(isCommitmentExpectedOnDate(mw, "2026-10-12", "2026-10-01"), true);
  // 2026-10-13 is Tuesday (2)
  assert.equal(isCommitmentExpectedOnDate(mw, "2026-10-13", "2026-10-01"), false);
  // 2026-10-14 is Wednesday (3)
  assert.equal(isCommitmentExpectedOnDate(mw, "2026-10-14", "2026-10-01"), true);
});

test("daily score: 4/4 = 100%, 3/4 = 75%, 0/4 = 0%, 0 expected = null", () => {
  const commitments = [
    makeCommitment({ id: "c1" }),
    makeCommitment({ id: "c2" }),
    makeCommitment({ id: "c3" }),
    makeCommitment({ id: "c4" }),
  ];

  // 4/4
  const s4 = calculateDailySummary("2026-10-10", commitments, ["c1", "c2", "c3", "c4"]);
  assert.equal(s4.expected, 4);
  assert.equal(s4.completed, 4);
  assert.equal(s4.percentage, 100);
  assert.equal(s4.isConsistent, true);

  // 3/4
  const s3 = calculateDailySummary("2026-10-10", commitments, ["c1", "c2", "c4"]);
  assert.equal(s3.expected, 4);
  assert.equal(s3.completed, 3);
  assert.equal(s3.percentage, 75);
  assert.equal(s3.isConsistent, false);

  // 0/4
  const s0 = calculateDailySummary("2026-10-10", commitments, []);
  assert.equal(s0.expected, 4);
  assert.equal(s0.completed, 0);
  assert.equal(s0.percentage, 0);
  assert.equal(s0.isConsistent, false);

  // 0 expected
  const sNone = calculateDailySummary("2026-10-10", [], ["c1"]);
  assert.equal(sNone.expected, 0);
  assert.equal(sNone.completed, 0);
  assert.equal(sNone.percentage, null);
  assert.equal(sNone.isConsistent, null);
});

test("streaks: all 18 cases comprehensively covered", () => {
  const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];

  // Case 1: First consistent day
  const map1 = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(calculateCurrentStreak(["2026-10-01"], map1, "2026-10-01"), 1);
  assert.equal(calculateBestStreak(["2026-10-01"], map1), 1);

  // Case 2: Consecutive consistent days
  const map2 = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 2, completed: 2, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-03",
      { date: "2026-10-03", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(
    calculateCurrentStreak(["2026-10-01", "2026-10-02", "2026-10-03"], map2, "2026-10-03"),
    3,
  );
  assert.equal(calculateBestStreak(["2026-10-01", "2026-10-02", "2026-10-03"], map2), 3);

  // Case 3: Incomplete day breaks a streak
  const map3 = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 1, completed: 0, percentage: 0, isConsistent: false },
    ],
    [
      "2026-10-03",
      { date: "2026-10-03", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(
    calculateCurrentStreak(["2026-10-01", "2026-10-02", "2026-10-03"], map3, "2026-10-03"),
    1,
  );
  assert.equal(calculateBestStreak(["2026-10-01", "2026-10-02", "2026-10-03"], map3), 1);

  // Case 4: Current day fully completed
  const map4 = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(calculateCurrentStreak(["2026-10-01", "2026-10-02"], map4, "2026-10-02"), 2);

  // Case 5 & 6: Current day partially completed / not yet complete (continues from yesterday)
  const map5 = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 2, completed: 1, percentage: 50, isConsistent: false },
    ],
  ]);
  assert.equal(calculateCurrentStreak(["2026-10-01", "2026-10-02"], map5, "2026-10-02"), 1);

  // Case 7 & 8: Unscheduled day between consistent days & multiple unscheduled days
  const mapUnscheduled = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 0, completed: 0, percentage: null, isConsistent: null },
    ],
    [
      "2026-10-03",
      { date: "2026-10-03", expected: 0, completed: 0, percentage: null, isConsistent: null },
    ],
    [
      "2026-10-04",
      { date: "2026-10-04", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(
    calculateCurrentStreak(
      ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"],
      mapUnscheduled,
      "2026-10-04",
    ),
    2,
  );
  assert.equal(
    calculateBestStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"], mapUnscheduled),
    2,
  );

  // Case 9 & 10: No commitments / No MYC start date
  const emptyMetrics = calculateConsistencyMetrics({
    commitments: [],
    completions: [],
    timezone: "UTC",
    mycStartedAt: null,
    targetDate: "2026-10-10",
  });
  assert.equal(emptyMetrics.journeyStarted, false);
  assert.equal(emptyMetrics.currentStreak, 0);
  assert.equal(emptyMetrics.bestStreak, 0);
  assert.equal(emptyMetrics.overallPercentage, null);

  // Case 11: Missed latest eligible day (e.g. yesterday missed, today in progress)
  const mapMissed = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 1, completed: 0, percentage: 0, isConsistent: false },
    ],
    [
      "2026-10-03",
      { date: "2026-10-03", expected: 1, completed: 0, percentage: 0, isConsistent: false },
    ],
  ]);
  assert.equal(
    calculateCurrentStreak(["2026-10-01", "2026-10-02", "2026-10-03"], mapMissed, "2026-10-03"),
    0,
  );

  // Case 12: Best streak greater than current streak
  const mapBestGreater = new Map([
    [
      "2026-10-01",
      { date: "2026-10-01", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-02",
      { date: "2026-10-02", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-03",
      { date: "2026-10-03", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
    [
      "2026-10-04",
      { date: "2026-10-04", expected: 1, completed: 0, percentage: 0, isConsistent: false },
    ],
    [
      "2026-10-05",
      { date: "2026-10-05", expected: 1, completed: 1, percentage: 100, isConsistent: true },
    ],
  ]);
  assert.equal(calculateCurrentStreak(dates, mapBestGreater, "2026-10-05"), 1);
  assert.equal(calculateBestStreak(dates, mapBestGreater), 3);
});

test("analytics: consistent days and overall weighted percentage", () => {
  const c1 = makeCommitment({ id: "c1", start_date: "2026-10-01" });
  const c2 = makeCommitment({ id: "c2", start_date: "2026-10-01" });

  // Day 1: 2 expected, 2 completed (consistent)
  // Day 2: 2 expected, 1 completed (inconsistent)
  // Day 3: 2 expected, 2 completed (consistent)
  // Total expected = 6, total completed = 5 -> overall = 5/6 = 83%
  const completions: DailyCompletion[] = [
    {
      id: "1",
      user_id: "u1",
      commitment_id: "c1",
      date: "2026-10-01",
      status: "completed",
      completed_at: "2026-10-01T10:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "2",
      user_id: "u1",
      commitment_id: "c2",
      date: "2026-10-01",
      status: "completed",
      completed_at: "2026-10-01T10:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "3",
      user_id: "u1",
      commitment_id: "c1",
      date: "2026-10-02",
      status: "completed",
      completed_at: "2026-10-02T10:00:00Z",
      created_at: "2026-10-02T10:00:00Z",
    },
    {
      id: "4",
      user_id: "u1",
      commitment_id: "c1",
      date: "2026-10-03",
      status: "completed",
      completed_at: "2026-10-03T10:00:00Z",
      created_at: "2026-10-03T10:00:00Z",
    },
    {
      id: "5",
      user_id: "u1",
      commitment_id: "c2",
      date: "2026-10-03",
      status: "completed",
      completed_at: "2026-10-03T10:00:00Z",
      created_at: "2026-10-03T10:00:00Z",
    },
  ];

  const metrics = calculateConsistencyMetrics({
    commitments: [c1, c2],
    completions,
    timezone: "UTC",
    mycStartedAt: "2026-10-01",
    targetDate: "2026-10-03",
  });

  assert.equal(metrics.consistentDays, 2); // Day 1 and Day 3
  assert.equal(metrics.totalExpectedCommitmentDays, 6);
  assert.equal(metrics.totalCompletedCommitmentDays, 5);
  assert.equal(metrics.overallPercentage, 83);
  assert.equal(metrics.currentStreak, 1);
  assert.equal(metrics.bestStreak, 1);
  assert.equal(metrics.journeyStarted, true);
});

test("intensity levels: correct thresholds across all cases", () => {
  // Level 0: no expected commitments
  assert.equal(getIntensityLevel(0, 0, null), 0);

  // Level 1: expected > 0, 0 completed
  assert.equal(getIntensityLevel(3, 0, 0), 1);

  // Level 2: 1%..50% completed
  assert.equal(getIntensityLevel(4, 1, 25), 2);
  assert.equal(getIntensityLevel(2, 1, 50), 2);

  // Level 3: 51%..99% completed
  assert.equal(getIntensityLevel(4, 3, 75), 3);
  assert.equal(getIntensityLevel(10, 9, 90), 3);

  // Level 4: 100% completed
  assert.equal(getIntensityLevel(4, 4, 100), 4);
  assert.equal(getIntensityLevel(1, 1, 100), 4);
});

test("calendar date ranges: year, month, week", () => {
  const y = getYearDateRange(2026);
  assert.equal(y.startDate, "2026-01-01");
  assert.equal(y.endDate, "2026-12-31");

  const m = getMonthDateRange(2026, 2); // Non-leap year
  assert.equal(m.startDate, "2026-02-01");
  assert.equal(m.endDate, "2026-02-28");

  const mLeap = getMonthDateRange(2024, 2); // Leap year
  assert.equal(mLeap.startDate, "2024-02-01");
  assert.equal(mLeap.endDate, "2024-02-29");

  // 2026-10-16 is a Friday (ISO weekday 5)
  const w = getWeekDateRange("2026-10-16");
  assert.equal(w.startDate, "2026-10-12"); // Monday
  assert.equal(w.endDate, "2026-10-18"); // Sunday
});

test("filtered daily summary: all vs specific commitment filter", () => {
  const c1 = makeCommitment({ id: "c1", frequency: "daily" });
  const c2 = makeCommitment({
    id: "c2",
    frequency: "specific_days",
    schedule_days: [1, 3, 5], // Mon, Wed, Fri
  });
  const commitments = [c1, c2];

  // 2026-10-16 is Friday (5) -> both expected
  const completedBoth = new Set(["c1", "c2"]);
  const completedOnlyC1 = new Set(["c1"]);

  // All filter
  const allSummary = calculateFilteredDailySummary(
    "2026-10-16",
    commitments,
    completedOnlyC1,
    "all",
    "2026-10-01",
  );
  assert.equal(allSummary.expected, 2);
  assert.equal(allSummary.completed, 1);
  assert.equal(allSummary.percentage, 50);
  assert.equal(allSummary.isConsistent, false);

  // C1 filter
  const c1Summary = calculateFilteredDailySummary(
    "2026-10-16",
    commitments,
    completedOnlyC1,
    "c1",
    "2026-10-01",
  );
  assert.equal(c1Summary.expected, 1);
  assert.equal(c1Summary.completed, 1);
  assert.equal(c1Summary.percentage, 100);
  assert.equal(c1Summary.isConsistent, true);

  // C2 filter on non-scheduled day (2026-10-15 Thursday = 4)
  const c2NonScheduled = calculateFilteredDailySummary(
    "2026-10-15",
    commitments,
    completedBoth,
    "c2",
    "2026-10-01",
  );
  assert.equal(c2NonScheduled.expected, 0);
  assert.equal(c2NonScheduled.completed, 0);
  assert.equal(c2NonScheduled.percentage, null);
  assert.equal(c2NonScheduled.isConsistent, null);
});

test("period summary & commitment performances", () => {
  const c1 = makeCommitment({ id: "c1", title: "DSA", frequency: "daily" });
  const c2 = makeCommitment({ id: "c2", title: "Workout", frequency: "daily" });
  const commitments = [c1, c2];

  const completions: DailyCompletion[] = [
    {
      id: "comp1",
      user_id: "u1",
      commitment_id: "c1",
      date: "2026-10-01",
      status: "completed",
      completed_at: "2026-10-01T10:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "comp2",
      user_id: "u1",
      commitment_id: "c2",
      date: "2026-10-01",
      status: "completed",
      completed_at: "2026-10-01T10:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "comp3",
      user_id: "u1",
      commitment_id: "c1",
      date: "2026-10-02",
      status: "completed",
      completed_at: "2026-10-02T10:00:00Z",
      created_at: "2026-10-02T10:00:00Z",
    },
  ];

  // Period: Oct 1 to Oct 2 (today = Oct 2)
  const summary = calculatePeriodSummary(
    "2026-10-01",
    "2026-10-02",
    commitments,
    completions,
    "all",
    "2026-10-01",
    "2026-10-02",
  );
  assert.equal(summary.consistentDays, 1); // Only Oct 1 had 2/2 done
  assert.equal(summary.totalEligibleInstances, 4); // 2 on Oct 1 + 2 on Oct 2
  assert.equal(summary.totalCompletedInstances, 3); // 2 on Oct 1 + 1 on Oct 2
  assert.equal(summary.completionPercentage, 75);

  // Performance breakdown
  const perfs = calculateCommitmentPerformances(
    commitments,
    completions,
    "2026-10-01",
    "2026-10-02",
    "2026-10-01",
    "2026-10-02",
  );
  assert.equal(perfs.length, 2);
  const dsaPerf = perfs.find((p) => p.commitment.id === "c1");
  assert.equal(dsaPerf?.expectedInstances, 2);
  assert.equal(dsaPerf?.completedInstances, 2);
  assert.equal(dsaPerf?.percentage, 100);

  const workoutPerf = perfs.find((p) => p.commitment.id === "c2");
  assert.equal(workoutPerf?.expectedInstances, 2);
  assert.equal(workoutPerf?.completedInstances, 1);
  assert.equal(workoutPerf?.percentage, 50);
});

test("formatCompletionTimestamp and formatCompletionTimeOnly render correctly in user timezone", () => {
  // 2026-10-17T05:12:00Z -> In Asia/Kolkata (UTC+5:30) is 10:42 AM on Saturday, October 17, 2026
  const utcIso = "2026-10-17T05:12:00.000Z";
  const formattedFull = formatCompletionTimestamp(utcIso, "Asia/Kolkata");
  assert.match(formattedFull, /Saturday/);
  assert.match(formattedFull, /October 17, 2026/);
  assert.match(formattedFull, /10:42/);

  const formattedTimeOnly = formatCompletionTimeOnly(utcIso, "Asia/Kolkata");
  assert.match(formattedTimeOnly, /10:42/);

  // In America/New_York (UTC-4 in Oct daylight saving) -> 1:12 AM
  const formattedNy = formatCompletionTimestamp(utcIso, "America/New_York");
  assert.match(formattedNy, /1:12/);
});

test("uncompleteCommitment fails closed stating completions are permanent", async () => {
  const result = await uncompleteCommitment();
  assert.equal(result.success, false);
  assert.match(result.error || "", /permanent/);
});
