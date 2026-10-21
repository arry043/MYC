import { NativeModules, Platform } from "react-native";

import type { ConsistencyMetrics, DailyCommitmentItem } from "@myc/types";
import { getDashboardConsistencyData, getUserLocalDateString } from "@myc/utils";

import { getSupabase } from "@/lib/supabase";

const { MycWidgetBridge } = NativeModules;

export interface WidgetCommitmentItem {
  id: string;
  title: string;
  isCompleted: boolean;
  tone?: string;
}

export interface WidgetPayload {
  isSignedIn: boolean;
  streak: number;
  bestStreak: number;
  todayCompleted: number;
  todayExpected: number;
  todayPercentage: number;
  todayDate: string;
  commitments: WidgetCommitmentItem[];
}

/**
 * Synchronizes today's consistency metrics and scheduled commitments with
 * native Android home-screen widgets.
 *
 * Uses the exact same streak engine and schedule rules calculated in TypeScript
 * via `@myc/utils` without duplicating any business logic in native code.
 */
export async function syncWidgetData(
  metrics: ConsistencyMetrics | null,
  todayItems: DailyCommitmentItem[],
  timezone?: string,
): Promise<void> {
  if (Platform.OS !== "android" || !MycWidgetBridge?.setWidgetData) {
    return;
  }

  try {
    const todayDate = getUserLocalDateString(timezone);
    const expected = metrics?.today?.expected ?? todayItems.length;
    const completed = metrics?.today?.completed ?? todayItems.filter((i) => i.isCompleted).length;
    const percentage =
      expected > 0
        ? Math.round((completed / expected) * 100)
        : metrics?.today?.percentage != null
          ? Math.round(metrics.today.percentage)
          : 0;

    const payload: WidgetPayload = {
      isSignedIn: true,
      streak: metrics?.currentStreak ?? 0,
      bestStreak: metrics?.bestStreak ?? 0,
      todayCompleted: completed,
      todayExpected: expected,
      todayPercentage: percentage,
      todayDate,
      commitments: todayItems.map((item) => ({
        id: item.commitment.id,
        title: item.commitment.title,
        isCompleted: item.isCompleted,
        tone: item.commitment.tone ?? "sky",
      })),
    };

    await MycWidgetBridge.setWidgetData(JSON.stringify(payload));
  } catch (error) {
    // Non-fatal logging for widget sync
    console.warn("Failed to sync widget data:", error);
  }
}

/**
 * Clears widget data immediately upon user sign-out, switching widgets to a
 * neutral signed-out prompt. Never retains tokens or private user data.
 */
export async function clearWidgets(): Promise<void> {
  if (Platform.OS !== "android" || !MycWidgetBridge?.clearWidgetData) {
    return;
  }

  try {
    await MycWidgetBridge.clearWidgetData();
  } catch (error) {
    console.warn("Failed to clear widget data:", error);
  }
}

/**
 * Manually requests native widgets to reload their views from current cached data.
 */
export async function reloadWidgets(): Promise<void> {
  if (Platform.OS !== "android" || !MycWidgetBridge?.reloadAllWidgets) {
    return;
  }

  try {
    await MycWidgetBridge.reloadAllWidgets();
  } catch (error) {
    console.warn("Failed to reload widgets:", error);
  }
}

/**
 * Convenience helper to pull current dashboard metrics from Supabase
 * and synchronize native widgets immediately.
 */
export async function syncWidgetsFromBackend(): Promise<void> {
  if (Platform.OS !== "android" || !MycWidgetBridge?.setWidgetData) {
    return;
  }

  try {
    const supabase = getSupabase();
    const data = await getDashboardConsistencyData(supabase);
    await syncWidgetData(data.metrics, data.todayItems, data.profile?.timezone || "UTC");
  } catch (error) {
    console.warn("Failed to sync widgets from backend:", error);
  }
}
