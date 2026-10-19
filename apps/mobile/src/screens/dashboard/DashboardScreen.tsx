import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  History,
  MessageSquare,
  Plus,
  Sprout,
  Target,
  Trophy,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  AnalyticsChartPoint,
  Commitment,
  ConsistencyMetrics,
  DailyCommitmentItem,
  DailyCompletion,
  Profile,
} from "@myc/types";
import {
  addDays,
  formatCompletionTimeOnly,
  formatFrequency,
  getDashboardConsistencyData,
  getDateRange,
  getUserLocalDateString,
} from "@myc/utils";

import { CommitmentHistoryModal } from "@/components/commitments/CommitmentHistoryModal";
import { CompleteCommitmentModal } from "@/components/commitments/CompleteCommitmentModal";
import { AnalyticsChart } from "@/components/shared/AnalyticsChart";
import { Skeleton } from "@/components/shared/Motion";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

const TONE_DOT_COLORS: Record<string, string> = {
  sky: "#38BDF8",
  lavender: "#C084FC",
  peach: "#FDBA74",
  mint: "#34D399",
  sun: "#FBBF24",
};

export interface DashboardScreenProps {
  onNavigateToCalendar?: () => void;
  onNavigateToCommitments?: () => void;
}

export function DashboardScreen({ onNavigateToCommitments }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ConsistencyMetrics | null>(null);
  const [todayItems, setTodayItems] = useState<DailyCommitmentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayDate, setTodayDate] = useState(() => getUserLocalDateString());
  const [allCommitments, setAllCommitments] = useState<Commitment[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<DailyCompletion[]>([]);

  // Modals state
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [historyCommitment, setHistoryCommitment] = useState<Commitment | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const data = await getDashboardConsistencyData(supabase);

      const userTimezone = data.profile?.timezone || "UTC";
      const localToday = getUserLocalDateString(userTimezone);

      setMetrics(data.metrics);
      setTodayItems(data.todayItems);
      setProfile(data.profile);
      setTodayDate(localToday);

      // Fetch all commitments for empty-state check and modal mapping
      const { data: comms } = await supabase
        .from("commitments")
        .select("*")
        .order("created_at", { ascending: true });

      const commitmentsList = (comms as Commitment[]) || [];
      setAllCommitments(commitmentsList);

      // Fetch week's completions for 7-day mini chart
      const startDay = addDays(localToday, -6);
      const last7Days = getDateRange(startDay, localToday);
      const startDate = last7Days[0];
      const endDate = last7Days[last7Days.length - 1];

      if (startDate && endDate) {
        const { data: comps } = await supabase
          .from("daily_completions")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate);

        setWeekCompletions((comps as DailyCompletion[]) || []);
      }
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      if (isMounted) {
        await loadDashboardData();
      }
    };

    void fetchInitialData();

    // Supabase Realtime subscriptions for multi-device sync
    const supabase = getSupabase();
    const completionsChannel = supabase
      .channel("mobile:daily_completions")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_completions" }, () => {
        void loadDashboardData();
      })
      .subscribe();

    const commitmentsChannel = supabase
      .channel("mobile:commitments")
      .on("postgres_changes", { event: "*", schema: "public", table: "commitments" }, () => {
        void loadDashboardData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(completionsChannel);
      void supabase.removeChannel(commitmentsChannel);
    };
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadDashboardData();
  };

  const handleInitiateCompletion = (item: DailyCommitmentItem) => {
    setSelectedCommitment(item.commitment);
    setCompleteModalVisible(true);
  };

  const timezone = profile?.timezone || "UTC";

  // Journey day calculation (matches web dashboard-view.tsx)
  let journeyDay = 1;
  const hasStartedJourney = Boolean(profile?.myc_started_at);
  if (profile?.myc_started_at) {
    const days = getDateRange(
      profile.myc_started_at,
      todayDate || getUserLocalDateString(timezone),
    );
    journeyDay = Math.max(1, days.length);
  }

  const todayPercentage = metrics?.today?.percentage ?? 0;
  const expectedCount = metrics?.today?.expected ?? 0;
  const completedCount = metrics?.today?.completed ?? 0;
  const remainingCount = Math.max(0, expectedCount - completedCount);

  // 7-day mini chart data
  const start7Day = addDays(todayDate, -6);
  const last7Days = getDateRange(start7Day, todayDate);
  const weekChartPoints: AnalyticsChartPoint[] = last7Days.map((d) => {
    const expected = allCommitments.filter((c) => {
      if (c.status !== "active") return false;
      if (c.start_date && c.start_date > d) return false;
      if (c.end_date && c.end_date < d) return false;
      if (c.frequency === "daily") return true;
      const dayOfWeek = new Date(d).getUTCDay() || 7;
      return (c.schedule_days || []).includes(dayOfWeek);
    }).length;

    const completed = weekCompletions.filter((c) => c.date === d).length;
    const pct = expected > 0 ? Math.round((completed / expected) * 100) : null;
    const isConsistent = expected > 0 ? completed === expected : null;

    const dayName = new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });

    return {
      date: d,
      label: dayName,
      expected,
      completed,
      percentage: pct,
      isConsistent,
    };
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DASHBOARD</Text>
        <Text style={styles.title}>Show up today.</Text>
        <Text style={styles.description}>
          One day at a time. Consistency compounds into identity.
        </Text>

        {onNavigateToCommitments && (
          <Button
            variant="secondary"
            size="sm"
            onPress={onNavigateToCommitments}
            style={styles.manageButton}
          >
            <Plus size={15} color={colors.foreground} />
            Manage commitments
          </Button>
        )}
      </View>

      {/* Loading Skeleton */}
      {loading && !refreshing && (
        <View style={{ gap: 16 }}>
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Skeleton height={88} borderRadius={radii.lg} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={88} borderRadius={radii.lg} />
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Skeleton height={88} borderRadius={radii.lg} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={88} borderRadius={radii.lg} />
              </View>
            </View>
          </View>
          <Skeleton height={140} borderRadius={radii.xl} />
          <Skeleton height={180} borderRadius={radii.xl} />
        </View>
      )}

      {!loading && (
        <View style={styles.cardsList}>
          {/* 1. Stat Cards Grid (2x2) */}
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCard
                label="Current streak"
                value={String(hasStartedJourney ? (metrics?.currentStreak ?? 0) : 0)}
                unit="days"
                tone="peach"
                icon={Flame}
              />
              <StatCard
                label="Best streak"
                value={String(hasStartedJourney ? (metrics?.bestStreak ?? 0) : 0)}
                unit="days"
                tone="lavender"
                icon={Trophy}
              />
            </View>

            <View style={styles.statRow}>
              <StatCard
                label="Overall consistency"
                value={
                  hasStartedJourney && metrics?.overallPercentage !== null
                    ? `${metrics?.overallPercentage}%`
                    : "—"
                }
                tone="sky"
                icon={Target}
              />
              <StatCard
                label="Journey day"
                value={hasStartedJourney ? String(journeyDay) : "—"}
                tone="mint"
                icon={Sprout}
              />
            </View>
          </View>

          {/* 2. Today's Focus Card */}
          <Card style={styles.focusCard}>
            <Text style={styles.focusEyebrow}>TODAY&apos;S FOCUS</Text>
            <Text style={styles.focusTitle}>
              {expectedCount === 0
                ? "No commitments scheduled today"
                : `${completedCount} of ${expectedCount} completed`}
            </Text>
            <Text style={styles.focusDesc}>
              Show up for yourself today. Every completed commitment counts.
            </Text>

            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progress today</Text>
              <Text style={styles.progressVal}>{todayPercentage}%</Text>
            </View>
            <ProgressBar
              value={todayPercentage}
              height={8}
              color={colors.primary}
              backgroundColor="#E2E8F0"
            />
          </Card>

          {/* 3. Circular Progress Ring Card */}
          <Card style={styles.circularCard}>
            <ProgressRing
              value={todayPercentage}
              size={160}
              strokeWidth={14}
              color={colors.primary}
            >
              <Text style={styles.ringValueText}>{todayPercentage}%</Text>
              <Text style={styles.ringSubText}>today</Text>
            </ProgressRing>

            <View style={styles.tasksSummaryGroup}>
              <Text style={styles.tasksSummaryCount}>
                {completedCount} / {expectedCount} tasks
              </Text>
              <Text style={styles.tasksRemainingText}>{remainingCount} remaining</Text>
            </View>
          </Card>

          {/* 4. Today's Commitments Section */}
          <View style={styles.commitmentsSection}>
            <View style={styles.commitmentsHeaderRow}>
              <Text style={styles.sectionHeading}>Today&apos;s commitments</Text>
              {onNavigateToCommitments && (
                <Pressable onPress={onNavigateToCommitments} hitSlop={8}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              )}
            </View>

            {todayItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing scheduled for today</Text>
                <Text style={styles.emptySub}>
                  You have no active commitments scheduled for today. Take a breath or review your
                  schedule.
                </Text>
              </Card>
            ) : (
              <Card style={styles.todayListCard}>
                {todayItems.map((item, index) => {
                  const dotColor = TONE_DOT_COLORS[item.commitment.tone || "sky"] || "#38BDF8";
                  const completedTime = item.completedAt
                    ? formatCompletionTimeOnly(item.completedAt, timezone)
                    : null;
                  const isLast = index === todayItems.length - 1;

                  return (
                    <View
                      key={item.commitment.id}
                      style={[styles.todayItemContainer, !isLast && styles.todayItemBorder]}
                    >
                      <View style={styles.todayItemRow}>
                        <Pressable
                          disabled={item.isCompleted}
                          onPress={() => handleInitiateCompletion(item)}
                          style={styles.checkTouchArea}
                          accessibilityLabel={
                            item.isCompleted
                              ? `${item.commitment.title} done`
                              : `Mark ${item.commitment.title} complete`
                          }
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 size={22} color="#16A34A" />
                          ) : (
                            <Circle size={22} color="#94A3B8" />
                          )}
                        </Pressable>

                        <View style={styles.todayItemContent}>
                          <Text
                            style={[
                              styles.todayItemTitle,
                              item.isCompleted && styles.todayItemTitleDone,
                            ]}
                            numberOfLines={1}
                          >
                            {item.commitment.title}
                          </Text>

                          <View style={styles.todayItemSubRow}>
                            <View style={[styles.smallToneDot, { backgroundColor: dotColor }]} />
                            <Text style={styles.todayItemFreq}>
                              {formatFrequency(
                                item.commitment.frequency,
                                item.commitment.schedule_days,
                              )}
                            </Text>

                            {completedTime && (
                              <View style={styles.timeTag}>
                                <Clock size={11} color="#16A34A" />
                                <Text style={styles.timeText}>{completedTime}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.todayItemRight}>
                          {item.isCompleted ? (
                            <Badge tone="success">Done</Badge>
                          ) : (
                            <Badge tone="outline">Not yet</Badge>
                          )}

                          <Pressable
                            onPress={() => setHistoryCommitment(item.commitment)}
                            style={styles.itemHistoryBtn}
                            hitSlop={8}
                            accessibilityLabel={`View history for ${item.commitment.title}`}
                          >
                            <History size={15} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Comment preview if note added */}
                      {item.isCompleted && item.comment && (
                        <View style={styles.commentBox}>
                          <MessageSquare size={13} color={colors.mutedForeground} />
                          <Text style={styles.commentText}>&ldquo;{item.comment}&rdquo;</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </Card>
            )}
          </View>

          {/* 5. This Week Section */}
          <View style={styles.weekSection}>
            <Text style={styles.sectionHeading}>This week</Text>

            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Daily consistency</Text>
              <Text style={styles.chartSub}>Last 7 days</Text>
              <AnalyticsChart points={weekChartPoints} />
            </Card>
          </View>
        </View>
      )}

      {/* Complete Commitment Modal */}
      <CompleteCommitmentModal
        visible={completeModalVisible}
        commitment={selectedCommitment}
        date={todayDate}
        onClose={() => {
          setCompleteModalVisible(false);
          setSelectedCommitment(null);
        }}
        onSuccess={() => {
          setCompleteModalVisible(false);
          setSelectedCommitment(null);
          void loadDashboardData();
        }}
      />

      {/* History Modal */}
      <CommitmentHistoryModal
        visible={Boolean(historyCommitment)}
        commitment={historyCommitment}
        timezone={timezone}
        onClose={() => setHistoryCommitment(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.88,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginTop: 2,
  },
  manageButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardsList: {
    gap: 16,
  },
  statGrid: {
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  focusCard: {
    padding: 20,
    gap: 6,
  },
  focusEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  focusTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  focusDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  progressVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  circularCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  ringValueText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
  },
  ringSubText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  tasksSummaryGroup: {
    alignItems: "center",
    gap: 3,
  },
  tasksSummaryCount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  tasksRemainingText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  commitmentsSection: {
    gap: 12,
  },
  commitmentsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  todayListCard: {
    padding: 0,
    overflow: "hidden",
  },
  todayItemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  todayItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  todayItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checkTouchArea: {
    padding: 2,
  },
  todayItemContent: {
    flex: 1,
    gap: 3,
  },
  todayItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  todayItemTitleDone: {
    textDecorationLine: "line-through",
    color: colors.mutedForeground,
  },
  todayItemSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallToneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  todayItemFreq: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  todayItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemHistoryBtn: {
    padding: 4,
  },
  commentBox: {
    marginLeft: 32,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentText: {
    flex: 1,
    fontSize: 12,
    fontStyle: "italic",
    color: colors.foreground,
    lineHeight: 16,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
  weekSection: {
    gap: 12,
  },
  chartCard: {
    padding: 16,
    gap: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  chartSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
});
