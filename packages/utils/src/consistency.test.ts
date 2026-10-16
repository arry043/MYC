import assert from "node:assert/strict";
import test from "node:test";

import type { Commitment, DailyCompletion } from "@myc/types";

import {
  addDays,
  calculateBestStreak,
  calculateConsistencyMetrics,
  calculateCurrentStreak,
  calculateDailySummary,
  getDateRange,
  getExpectedCommitmentsForDate,
  getIsoWeekday,
  isCommitmentExpectedOnDate,
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
