import type { Tables } from "./database";

export type Profile = Tables<"profiles">;
export type Commitment = Tables<"commitments">;

export type CommitmentStatus = "draft" | "active" | "paused" | "archived";
export type CommitmentFrequency = "daily" | "specific_days" | "single_day";
export type CommitmentTone = "sky" | "lavender" | "peach" | "mint" | "sun";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CreateCommitmentInput {
  title: string;
  description?: string | null;
  frequency: CommitmentFrequency;
  schedule_days?: Weekday[] | null;
  scheduled_date?: string | null;
  start_date?: string;
  end_date?: string | null;
  tone?: CommitmentTone;
}

export interface UpdateCommitmentInput {
  title?: string;
  description?: string | null;
  frequency?: CommitmentFrequency;
  schedule_days?: Weekday[] | null;
  scheduled_date?: string | null;
  start_date?: string;
  end_date?: string | null;
  status?: CommitmentStatus;
  tone?: CommitmentTone;
}

export interface ConfirmCommitmentResult {
  commitment: Commitment;
  profile: Profile;
  myc_started_at: string;
}

export type DailyCompletion = Tables<"daily_completions">;

export interface DailyCommitmentItem {
  commitment: Commitment;
  isCompleted: boolean;
  completedAt: string | null;
  comment?: string | null;
}

export interface CompletionHistoryEntry {
  id: string;
  commitmentId: string;
  commitmentTitle: string;
  commitmentDescription?: string | null;
  date: string;
  completedAt: string;
  comment: string | null;
}

export interface DailyConsistencySummary {
  date: string;
  expected: number;
  completed: number;
  percentage: number | null;
  isConsistent: boolean | null;
}

export interface ConsistencyMetrics {
  currentStreak: number;
  bestStreak: number;
  consistentDays: number;
  overallPercentage: number | null;
  today: DailyConsistencySummary;
  journeyStarted: boolean;
  mycStartedAt: string | null;
  totalExpectedCommitmentDays: number;
  totalCompletedCommitmentDays: number;
}

export type CalendarView = "year" | "month" | "week" | "day";
export type ConsistencyIntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface CalendarDayData {
  date: string;
  dayOfMonth: number;
  month: number;
  year: number;
  isoWeekday: Weekday;
  isToday: boolean;
  isFuture: boolean;
  isPreJourney: boolean;
  expected: number;
  completed: number;
  percentage: number | null;
  isConsistent: boolean | null;
  intensity: ConsistencyIntensityLevel;
  items?: DailyCommitmentItem[];
}

export interface PeriodSummary {
  startDate: string;
  endDate: string;
  consistentDays: number;
  totalEligibleInstances: number;
  totalCompletedInstances: number;
  completionPercentage: number | null;
}

export interface CommitmentPerformance {
  commitment: Commitment;
  expectedInstances: number;
  completedInstances: number;
  percentage: number | null;
}

export interface CalendarPageData {
  profile: Profile | null;
  commitments: Commitment[];
  mycStartedAt: string | null;
  todayDate: string;
  selectedDate: string;
  selectedYear: number;
  selectedMonth: number;
  view: CalendarView;
  filterCommitmentId: string | "all";
  days: CalendarDayData[];
  periodSummary: PeriodSummary;
  error?: string | null;
}

export type AnalyticsReportingPeriod = "7d" | "30d" | "year" | "all";

export interface AnalyticsChartPoint {
  date: string;
  label: string;
  sublabel?: string;
  percentage: number | null;
  completed: number;
  expected: number;
  isConsistent: boolean | null;
}

export interface AnalyticsPageData {
  profile: Profile | null;
  commitments: Commitment[];
  mycStartedAt: string | null;
  todayDate: string;
  metrics: ConsistencyMetrics;
  periodSummary: PeriodSummary;
  weeklyChart: {
    points: AnalyticsChartPoint[];
    label: string;
  };
  monthlyChart: {
    points: AnalyticsChartPoint[];
    label: string;
    year: number;
    month: number;
  };
  commitmentPerformances: CommitmentPerformance[];
  reportingPeriod: AnalyticsReportingPeriod;
  error?: string | null;
}

export type NotificationPreferences = Tables<"notification_preferences">;

export interface UpdateNotificationPreferencesInput {
  enabled?: boolean;
  daily_reminder_enabled?: boolean;
  daily_reminder_time?: string;
  incomplete_reminder_enabled?: boolean;
  incomplete_reminder_time?: string;
  streak_reminder_enabled?: boolean;
  push_token?: string | null;
}
