/**
 * Static sample content for the design-system placeholder pages (task 03).
 *
 * Nothing here is computed or stored: these are fixed values that show how real data will look.
 * Each export is replaced by database-backed data in the task noted beside it, and this file is
 * deleted once nothing imports it. Never add logic here.
 */

export type SampleCommitment = {
  id: string;
  title: string;
  schedule: string;
  status: "active" | "paused";
  doneToday: boolean;
  streakDays: number;
  consistency: number;
  tone: "sky" | "lavender" | "peach" | "mint" | "sun";
};

/** Replaced in tasks 06–08. */
export const sampleCommitments: readonly SampleCommitment[] = [
  {
    id: "dsa",
    title: "DSA practice",
    schedule: "Every day",
    status: "active",
    doneToday: true,
    streakDays: 14,
    consistency: 86,
    tone: "sky",
  },
  {
    id: "project",
    title: "Side project",
    schedule: "Weekdays",
    status: "active",
    doneToday: true,
    streakDays: 9,
    consistency: 78,
    tone: "lavender",
  },
  {
    id: "workout",
    title: "Workout",
    schedule: "Mon · Wed · Fri",
    status: "active",
    doneToday: true,
    streakDays: 21,
    consistency: 92,
    tone: "mint",
  },
  {
    id: "reading",
    title: "Read 20 pages",
    schedule: "Every day",
    status: "active",
    doneToday: false,
    streakDays: 5,
    consistency: 64,
    tone: "peach",
  },
  {
    id: "blog",
    title: "Write for the blog",
    schedule: "Sundays",
    status: "paused",
    doneToday: false,
    streakDays: 0,
    consistency: 41,
    tone: "sun",
  },
];

/** Replaced in tasks 08–09. */
export const sampleToday = { done: 3, total: 4, percent: 75 };

/** Days since the first "I COMMIT" (`myc_started_at`). Replaced in tasks 05–06. */
export const sampleJourney = { day: 40, startedOn: "7 September" };

/** Replaced in tasks 09 and 12. */
export const sampleStats = {
  currentStreak: 14,
  bestStreak: 21,
  consistentDays: 38,
  overallConsistency: 82,
};

/** Daily consistency for the last seven days. Replaced in task 12. */
export const sampleWeek = [
  { label: "Sat", value: 100 },
  { label: "Sun", value: 75 },
  { label: "Mon", value: 100 },
  { label: "Tue", value: 50 },
  { label: "Wed", value: 100 },
  { label: "Thu", value: 100 },
  { label: "Fri", value: 75 },
];

/** Weekly consistency for the last eight weeks. Replaced in task 12. */
export const sampleWeeks = [62, 70, 68, 77, 81, 74, 85, 82].map((value, index) => ({
  label: `W${index + 1}`,
  value,
}));

/**
 * One month of intensity levels (0 = nothing done … 4 = everything done; null = not yet
 * reached). Replaced in tasks 10–11.
 */
export const sampleMonth = {
  title: "October 2026",
  /** Blank cells before the 1st in a Monday-first grid. */
  leadingBlanks: 3,
  today: 16,
  // One row per calendar week, so the shape of the month stays readable.
  // prettier-ignore
  levels: [
                         4,    3,    4,    2,
       4,    4,    3,    0,    4,    4,    3,
       4,    2,    4,    4,    3, null, null,
    null, null, null, null, null, null, null,
    null, null, null, null, null, null,
  ] as const,
};
