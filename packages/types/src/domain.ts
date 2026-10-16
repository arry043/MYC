import type { Tables } from "./database";

export type Profile = Tables<"profiles">;
export type Commitment = Tables<"commitments">;

export type CommitmentStatus = "draft" | "active" | "paused" | "archived";
export type CommitmentFrequency = "daily" | "specific_days";
export type CommitmentTone = "sky" | "lavender" | "peach" | "mint" | "sun";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CreateCommitmentInput {
  title: string;
  description?: string | null;
  frequency: CommitmentFrequency;
  schedule_days?: Weekday[] | null;
  start_date?: string;
  end_date?: string | null;
  tone?: CommitmentTone;
}

export interface UpdateCommitmentInput {
  title?: string;
  description?: string | null;
  frequency?: CommitmentFrequency;
  schedule_days?: Weekday[] | null;
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
