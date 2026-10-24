import type { NotificationPreferences } from "@myc/types";

/**
 * Validates whether a reminder time string conforms to 24-hour HH:MM format.
 */
export function validateReminderTime(time: string): boolean {
  if (!time || typeof time !== "string") return false;
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time.trim());
}

/**
 * Default notification preferences for new users.
 * Disabled by default to avoid overwhelming users during onboarding.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  "id" | "user_id" | "created_at" | "updated_at"
> = {
  enabled: false,
  daily_reminder_enabled: true,
  daily_reminder_time: "09:00",
  incomplete_reminder_enabled: true,
  incomplete_reminder_time: "20:00",
  streak_reminder_enabled: true,
  push_token: null,
};

export interface ReminderMessage {
  title: string;
  body: string;
  deepLinkUrl: string;
}

/**
 * Returns calm, supportive messaging for the morning / daily check-in reminder.
 * Avoids guilt, false urgency, or aggressive engagement tactics per PRD §43.
 */
export function getDailyReminderMessage(): ReminderMessage {
  return {
    title: "MYC Daily Check-in",
    body: "Take a quiet moment for the commitments you planned today.",
    deepLinkUrl: "myc://dashboard",
  };
}

/**
 * Returns supportive messaging for incomplete commitments reminder.
 * Only sent if user has scheduled commitments remaining today.
 */
export function getIncompleteReminderMessage(remainingCount = 1): ReminderMessage {
  const itemText = remainingCount === 1 ? "1 commitment" : `${remainingCount} commitments`;
  return {
    title: "Today's Commitments",
    body: `You still have ${itemText} scheduled for today. A little progress still counts.`,
    deepLinkUrl: "myc://dashboard",
  };
}

/**
 * Returns supportive, non-pressuring messaging for streak encouragement.
 * Never threatens streak loss or uses manipulative warnings.
 */
export function getStreakReminderMessage(): ReminderMessage {
  return {
    title: "Show Up Today",
    body: "Consistency compounds into identity. Take a moment for your commitments when you're ready.",
    deepLinkUrl: "myc://dashboard",
  };
}

/**
 * Determines whether a daily reminder should be scheduled for the user.
 * Never schedules on days where no commitments are expected.
 */
export function shouldScheduleDailyReminder(
  prefs: Pick<NotificationPreferences, "enabled" | "daily_reminder_enabled"> | null | undefined,
  hasExpectedCommitmentsToday: boolean,
): boolean {
  if (!prefs?.enabled || !prefs.daily_reminder_enabled) {
    return false;
  }
  return hasExpectedCommitmentsToday;
}

/**
 * Determines whether an incomplete commitments reminder should be sent.
 * Fails closed if all commitments are complete or none were expected.
 */
export function shouldScheduleIncompleteReminder(
  prefs:
    Pick<NotificationPreferences, "enabled" | "incomplete_reminder_enabled"> | null | undefined,
  todayExpected: number,
  todayCompleted: number,
): boolean {
  if (!prefs?.enabled || !prefs.incomplete_reminder_enabled) {
    return false;
  }
  if (todayExpected <= 0) {
    return false;
  }
  return todayCompleted < todayExpected;
}

/**
 * Determines whether a streak reminder should be sent.
 * Only applicable if user has scheduled commitments today that remain incomplete.
 */
export function shouldScheduleStreakReminder(
  prefs: Pick<NotificationPreferences, "enabled" | "streak_reminder_enabled"> | null | undefined,
  todayExpected: number,
  todayCompleted: number,
): boolean {
  if (!prefs?.enabled || !prefs.streak_reminder_enabled) {
    return false;
  }
  if (todayExpected <= 0) {
    return false;
  }
  return todayCompleted < todayExpected;
}

/**
 * Parses HH:MM string into hour and minute integers.
 */
export function parseReminderTime(timeStr: string): { hour: number; minute: number } {
  if (!validateReminderTime(timeStr)) {
    return { hour: 9, minute: 0 };
  }
  const [hourStr, minuteStr] = timeStr.split(":");
  return {
    hour: parseInt(hourStr || "9", 10),
    minute: parseInt(minuteStr || "0", 10),
  };
}
