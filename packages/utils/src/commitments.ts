import type {
  CommitmentFrequency,
  CommitmentTone,
  CreateCommitmentInput,
  Weekday,
} from "@myc/types";

export const WEEKDAYS: { id: Weekday; label: string; short: string; letter: string }[] = [
  { id: 1, label: "Monday", short: "Mon", letter: "M" },
  { id: 2, label: "Tuesday", short: "Tue", letter: "T" },
  { id: 3, label: "Wednesday", short: "Wed", letter: "W" },
  { id: 4, label: "Thursday", short: "Thu", letter: "T" },
  { id: 5, label: "Friday", short: "Fri", letter: "F" },
  { id: 6, label: "Saturday", short: "Sat", letter: "S" },
  { id: 7, label: "Sunday", short: "Sun", letter: "S" },
];

export const VALID_TONES: CommitmentTone[] = ["sky", "lavender", "peach", "mint", "sun"];

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
 * Validates a commitment creation input.
 */
export function validateCommitmentInput(
  input: Partial<CreateCommitmentInput>,
  userTimezone?: string,
): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const title = input.title?.trim();
  if (!title) {
    errors.title = "Commitment title is required";
  } else if (title.length > 120) {
    errors.title = "Title cannot exceed 120 characters";
  }

  if (input.description && input.description.length > 500) {
    errors.description = "Description cannot exceed 500 characters";
  }

  const frequency = input.frequency as CommitmentFrequency;
  if (!frequency || !["daily", "specific_days", "single_day"].includes(frequency)) {
    errors.frequency = "Please choose a valid frequency";
  } else if (frequency === "specific_days") {
    const days = input.schedule_days;
    if (!days || !Array.isArray(days) || days.length === 0) {
      errors.schedule_days = "Please select at least one day of the week";
    } else {
      const validDays = days.every(
        (day) => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 7,
      );
      if (!validDays) {
        errors.schedule_days = "Selected days must be valid weekdays (1–7)";
      }
    }
  } else if (frequency === "single_day") {
    const scheduledDate = input.scheduled_date?.trim();
    if (!scheduledDate) {
      errors.scheduled_date = "Please select a date for this commitment";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      errors.scheduled_date = "Invalid date format (must be YYYY-MM-DD)";
    } else {
      const today = getUserLocalDateString(userTimezone);
      if (scheduledDate < today) {
        errors.scheduled_date = "Scheduled date cannot be in the past";
      }
    }
  }

  if (input.tone && !VALID_TONES.includes(input.tone)) {
    errors.tone = "Invalid accent color selected";
  }

  if (input.start_date && input.end_date) {
    if (input.end_date < input.start_date) {
      errors.end_date = "End date cannot be earlier than start date";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a YYYY-MM-DD date string into a friendly localized date (e.g., 'Oct 25, 2026').
 */
export function formatCommitmentDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Human-readable format for commitment frequency.
 */
export function formatFrequency(
  frequency: string,
  scheduleDays?: number[] | null,
  scheduledDate?: string | null,
): string {
  if (frequency === "daily") {
    return "Every day";
  }

  if (frequency === "single_day") {
    if (scheduledDate) {
      return `Single day · ${formatCommitmentDate(scheduledDate)}`;
    }
    return "Single day";
  }

  if (frequency === "specific_days" && scheduleDays && scheduleDays.length > 0) {
    const sorted = [...scheduleDays].sort((a, b) => a - b);
    if (sorted.length === 7) {
      return "Every day";
    }
    if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) {
      return "Weekdays (Mon–Fri)";
    }
    if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) {
      return "Weekends (Sat–Sun)";
    }
    const dayLabels = sorted
      .map((d) => WEEKDAYS.find((w) => w.id === d)?.short)
      .filter(Boolean) as string[];
    return dayLabels.join(" · ");
  }

  return "Custom schedule";
}
