import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AnalyticsPageData, AnalyticsReportingPeriod } from "@myc/types";
import { formatMonthYear, getAnalyticsData } from "@myc/utils";

import { AnalyticsChart } from "@/components/shared/AnalyticsChart";
import { Skeleton } from "@/components/shared/Motion";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSupabase } from "@/lib/supabase";
import { colors, radii } from "@/lib/theme";

const PERIOD_OPTIONS: { value: AnalyticsReportingPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const TONE_DOT_COLORS: Record<string, string> = {
  sky: "#38BDF8",
  lavender: "#C084FC",
  peach: "#FDBA74",
  mint: "#34D399",
  sun: "#FBBF24",
};

export interface AnalyticsScreenProps {
  onNavigateToCommitments?: () => void;
}

export function AnalyticsScreen({ onNavigateToCommitments }: AnalyticsScreenProps) {
  const [period, setPeriod] = useState<AnalyticsReportingPeriod>("7d");
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const data = await getAnalyticsData(supabase, {
        reportingPeriod: period,
        selectedYear,
        selectedMonth,
      });
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, selectedYear, selectedMonth]);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        const supabase = getSupabase();
        const data = await getAnalyticsData(supabase, {
          reportingPeriod: period,
          selectedYear,
          selectedMonth,
        });
        if (isMounted) {
          setAnalyticsData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load analytics data:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [period, selectedYear, selectedMonth]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handlePrevMonth = () => {
    let nextM = selectedMonth - 1;
    let nextY = selectedYear;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setSelectedMonth(nextM);
    setSelectedYear(nextY);
  };

  const handleNextMonth = () => {
    let nextM = selectedMonth + 1;
    let nextY = selectedYear;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setSelectedMonth(nextM);
    setSelectedYear(nextY);
  };

  const mycStartedAt = analyticsData?.mycStartedAt;
  const todayDate = analyticsData?.todayDate || "";
  const startMonthKey = mycStartedAt ? mycStartedAt.slice(0, 7) : null;
  const currentMonthKey = todayDate.slice(0, 7);
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const isPrevMonthDisabled = startMonthKey ? selectedMonthKey <= startMonthKey : false;
  const isNextMonthDisabled = selectedMonthKey >= currentMonthKey;

  const periodLabelText =
    period === "7d"
      ? "Last 7 days"
      : period === "30d"
        ? "Last 30 days"
        : period === "year"
          ? `Year ${selectedYear}`
          : "All time";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ANALYTICS</Text>
        <Text style={styles.title}>How consistent you&apos;ve been</Text>
        <Text style={styles.description}>
          Patterns over time, not judgement. Look for the trend, not the single day.
        </Text>
      </View>

      {/* Loading Skeleton */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
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
          <Skeleton height={50} borderRadius={radii.lg} />
          <Skeleton height={200} borderRadius={radii.xl} />
          <Skeleton height={200} borderRadius={radii.xl} />
        </View>
      )}

      {/* Pre-Journey Zero State */}
      {!loading && !mycStartedAt && (
        <Card style={styles.zeroStateCard}>
          <Text style={styles.zeroStateTitle}>Journey not started yet</Text>
          <Text style={styles.zeroStateDesc}>
            Real metrics, streaks, and trend charts require an active MYC journey. Pre-journey data
            is never fabricated.
          </Text>
          {onNavigateToCommitments && (
            <Button
              variant="primary"
              size="md"
              onPress={onNavigateToCommitments}
              style={{ marginTop: 8 }}
            >
              <Sparkles size={16} color={colors.primaryForeground} />
              Define your first commitment
            </Button>
          )}
        </Card>
      )}

      {/* Active Journey Analytics Content */}
      {!loading && mycStartedAt && analyticsData && (
        <View style={styles.cardsList}>
          {/* 1. Lifetime Metric Cards (2x2 Grid) */}
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCard
                label="Current streak"
                value={String(analyticsData.metrics.currentStreak)}
                unit="days"
                tone="peach"
                icon={Flame}
              />
              <StatCard
                label="Best streak"
                value={String(analyticsData.metrics.bestStreak)}
                unit="days"
                tone="sun"
                icon={Trophy}
              />
            </View>
            <View style={styles.statRow}>
              <StatCard
                label="Consistent days"
                value={String(analyticsData.metrics.consistentDays)}
                unit="days"
                tone="mint"
                icon={CalendarCheck2}
              />
              <StatCard
                label="Overall consistency"
                value={
                  analyticsData.metrics.overallPercentage !== null
                    ? `${analyticsData.metrics.overallPercentage}%`
                    : "N/A"
                }
                tone="sky"
                icon={Target}
              />
            </View>
          </View>

          {/* 2. Reporting Period Switcher */}
          <View style={styles.periodSection}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>Reporting Period</Text>
              <Text style={styles.periodSub}>
                Analyzing {periodLabelText} ({analyticsData.periodSummary.startDate} –{" "}
                {analyticsData.periodSummary.endDate})
              </Text>
            </View>

            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={period}
              onValueChange={(val) => setPeriod(val as AnalyticsReportingPeriod)}
            />
          </View>

          {/* 3. Weekly Consistency Card */}
          <Card style={styles.chartCard}>
            <Text style={styles.cardHeaderTitle}>Weekly consistency</Text>
            <Text style={styles.cardHeaderSub}>Daily consistency (last 7 days)</Text>
            <AnalyticsChart points={analyticsData.weeklyChart.points} />
          </Card>

          {/* 4. Period Performance Circular Card */}
          <Card style={styles.progressRingCard}>
            <ProgressRing
              value={analyticsData.periodSummary.completionPercentage ?? 0}
              size={160}
              strokeWidth={14}
              color={colors.primary}
            >
              <Text style={styles.ringValueText}>
                {analyticsData.periodSummary.completionPercentage !== null
                  ? `${analyticsData.periodSummary.completionPercentage}%`
                  : "—"}
              </Text>
              <Text style={styles.ringLabelText}>{periodLabelText}</Text>
            </ProgressRing>

            <View style={styles.periodSummaryTextGroup}>
              <Text style={styles.summaryTitle}>Period Performance</Text>
              <Text style={styles.summarySub}>
                {analyticsData.periodSummary.totalCompletedInstances} of{" "}
                {analyticsData.periodSummary.totalEligibleInstances} kept ·{" "}
                {analyticsData.periodSummary.consistentDays} consistent days
              </Text>
            </View>
          </Card>

          {/* 5. Monthly Consistency Card with Month Selector */}
          <Card style={styles.chartCard}>
            <View style={styles.monthlyHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.cardHeaderTitle}>Monthly consistency</Text>
                <Text style={styles.cardHeaderSub} numberOfLines={1}>
                  Daily consistency percentages across{" "}
                  {formatMonthYear(selectedYear, selectedMonth)}
                </Text>
              </View>

              <View style={styles.monthNavGroup}>
                <Pressable
                  onPress={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  style={({ pressed }) => [
                    styles.navIconButton,
                    isPrevMonthDisabled && styles.navDisabled,
                    pressed && styles.navPressed,
                  ]}
                  accessibilityLabel="Previous month"
                >
                  <ChevronLeft
                    size={16}
                    color={isPrevMonthDisabled ? colors.mutedForeground : colors.foreground}
                  />
                </Pressable>

                <Text style={styles.monthNavLabel}>
                  {formatMonthYear(selectedYear, selectedMonth)}
                </Text>

                <Pressable
                  onPress={handleNextMonth}
                  disabled={isNextMonthDisabled}
                  style={({ pressed }) => [
                    styles.navIconButton,
                    isNextMonthDisabled && styles.navDisabled,
                    pressed && styles.navPressed,
                  ]}
                  accessibilityLabel="Next month"
                >
                  <ChevronRight
                    size={16}
                    color={isNextMonthDisabled ? colors.mutedForeground : colors.foreground}
                  />
                </Pressable>
              </View>
            </View>

            <AnalyticsChart points={analyticsData.monthlyChart.points} isMonthly />
          </Card>

          {/* 6. Performance by Commitment */}
          <View style={styles.commitmentPerformancesSection}>
            <Text style={styles.sectionHeading}>Performance by commitment</Text>

            <View style={styles.performanceList}>
              {analyticsData.commitmentPerformances.map((perf) => {
                const pct = perf.percentage ?? 0;
                const dotColor = TONE_DOT_COLORS[perf.commitment.tone || "sky"] || "#38BDF8";
                const hasExpected = perf.expectedInstances > 0;

                return (
                  <Card key={perf.commitment.id} style={styles.performanceCard}>
                    <View style={styles.performanceTopRow}>
                      <View style={styles.perfLeftGroup}>
                        <View style={[styles.toneDot, { backgroundColor: dotColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.perfTitle}>{perf.commitment.title}</Text>
                          <Text style={styles.perfSub}>
                            {perf.commitment.frequency === "daily"
                              ? "Every day"
                              : "Specific scheduled days"}{" "}
                            · {periodLabelText}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.perfRightGroup}>
                        <Text style={styles.perfRatio}>
                          {perf.completedInstances} / {perf.expectedInstances} kept
                        </Text>
                        <Badge tone={hasExpected ? "sky" : "outline"}>
                          {perf.percentage !== null ? `${pct}%` : "N/A"}
                        </Badge>
                      </View>
                    </View>

                    <ProgressBar
                      value={pct}
                      height={6}
                      color={colors.primary}
                      backgroundColor="#F1F5F9"
                    />
                  </Card>
                );
              })}
            </View>
          </View>
        </View>
      )}
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
  },
  header: {
    marginBottom: 20,
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
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginTop: 4,
  },
  loadingContainer: {
    gap: 16,
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
  periodSection: {
    gap: 10,
    paddingVertical: 4,
  },
  periodHeader: {
    gap: 2,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  periodSub: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  chartCard: {
    padding: 16,
    gap: 4,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  progressRingCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  ringValueText: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
  },
  ringLabelText: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  periodSummaryTextGroup: {
    alignItems: "center",
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  summarySub: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  monthlyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.card,
  },
  navIconButton: {
    padding: 2,
  },
  navDisabled: {
    opacity: 0.35,
  },
  navPressed: {
    opacity: 0.6,
  },
  monthNavLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  commitmentPerformancesSection: {
    gap: 12,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  performanceList: {
    gap: 12,
  },
  performanceCard: {
    padding: 16,
    gap: 12,
  },
  performanceTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  perfLeftGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  toneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  perfTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 20,
  },
  perfSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  perfRightGroup: {
    alignItems: "flex-end",
    gap: 4,
  },
  perfRatio: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  zeroStateCard: {
    padding: 24,
    alignItems: "center",
    textAlign: "center",
    gap: 8,
  },
  zeroStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  zeroStateDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
});
