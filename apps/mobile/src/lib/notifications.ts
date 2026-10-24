import type { SupabaseClient } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { NotificationPreferences, UpdateNotificationPreferencesInput } from "@myc/types";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getDailyReminderMessage,
  getIncompleteReminderMessage,
  parseReminderTime,
} from "@myc/utils";

// Notification channel ID for Android 8.0+
export const REMINDER_CHANNEL_ID = "myc-reminders";

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Configure the Android notification channel for gentle reminders
 */
export async function setupNotificationChannelAsync(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "MYC Reminders",
      description: "Gentle reminders and check-ins for your consistency habits",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0284c7",
      sound: undefined,
    });
  } catch (err) {
    console.warn("Failed to set up notification channel:", err);
  }
}

/**
 * Check existing permission status
 */
export async function checkNotificationPermissionsAsync(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return Boolean(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED,
    );
  } catch (err) {
    console.warn("Failed to get notification permissions:", err);
    return false;
  }
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  try {
    await setupNotificationChannelAsync();
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false,
      },
    });
    return Boolean(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED,
    );
  } catch (err) {
    console.warn("Failed to request notification permissions:", err);
    return false;
  }
}

/**
 * Schedule or cancel recurring local reminders based on user preferences
 */
export async function syncScheduledNotificationsAsync(
  prefs: NotificationPreferences,
): Promise<void> {
  try {
    // Cancel all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // If master toggle is off, nothing more to schedule
    if (!prefs.enabled) {
      return;
    }

    const hasPermission = await checkNotificationPermissionsAsync();
    if (!hasPermission) {
      return;
    }

    await setupNotificationChannelAsync();

    // 1. Daily Check-in Reminder
    if (prefs.daily_reminder_enabled) {
      const dailyMsg = getDailyReminderMessage();
      const dailyTime = parseReminderTime(prefs.daily_reminder_time);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: dailyMsg.title,
          body: dailyMsg.body,
          data: { url: dailyMsg.deepLinkUrl },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: dailyTime.hour,
          minute: dailyTime.minute,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    }

    // 2. Incomplete Commitments Reminder
    if (prefs.incomplete_reminder_enabled) {
      const incompleteMsg = getIncompleteReminderMessage();
      const incompleteTime = parseReminderTime(prefs.incomplete_reminder_time);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: incompleteMsg.title,
          body: incompleteMsg.body,
          data: { url: incompleteMsg.deepLinkUrl },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: incompleteTime.hour,
          minute: incompleteTime.minute,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    }
  } catch (err) {
    console.warn("Failed to sync scheduled notifications:", err);
  }
}

/**
 * Cancel all notifications on sign-out
 */
export async function clearNotificationsAsync(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn("Failed to clear notifications:", err);
  }
}

/**
 * Fetch or initialize notification preferences for user
 */
export async function fetchNotificationPreferencesAsync(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch notification preferences:", error.message);
      return null;
    }

    if (data) {
      return data as NotificationPreferences;
    }

    // If no row exists yet, insert defaults
    const { data: inserted, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      })
      .select()
      .single();

    if (insertError) {
      console.warn("Failed to initialize notification preferences:", insertError.message);
      return null;
    }

    return inserted as NotificationPreferences;
  } catch (err) {
    console.warn("Exception fetching notification preferences:", err);
    return null;
  }
}

/**
 * Save notification preferences to Supabase and update local schedule
 */
export async function saveNotificationPreferencesAsync(
  supabase: SupabaseClient,
  userId: string,
  updates: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) {
      console.warn("Failed to save notification preferences:", error.message);
      throw error;
    }

    const updated = data as NotificationPreferences;
    await syncScheduledNotificationsAsync(updated);
    return updated;
  } catch (err) {
    console.warn("Exception saving notification preferences:", err);
    throw err;
  }
}
