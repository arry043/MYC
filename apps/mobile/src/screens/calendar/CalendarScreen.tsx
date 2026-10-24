import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  History,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Modal as RNModal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { CalendarPageData, CalendarView, Commitment } from "@myc/types";
import {
  addDays,
  formatCompletionTimeOnly,
  formatDisplayDate,
  formatFrequency,
  formatMonthYear,
  getCalendarData,
  getWeekDateRange,
} from "@myc/utils";

import { CommitmentHistoryModal } from "@/components/commitments/CommitmentHistoryModal";
import { CompleteCommitmentModal } from "@/components/commitments/CompleteCommitmentModal";
import { Skeleton } from "@/components/shared/Motion";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSupabase } from "@/lib/supabase";
import { colors, radii, shadows } from "@/lib/theme";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface CalendarScreenProps {
  onNavigateToCommitments?: () => void;
}

export function CalendarScreen({ onNavigateToCommitments }: CalendarScreenProps) {
  // Default to 'day' view per requirements
  const [view, setView] = useState<CalendarView>("day");
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [filterCommitmentId, setFilterCommitmentId] = useState<string | "all">("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [calendarData, setCalendarData] = useState<CalendarPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [completingCommitment, setCompletingCommitment] = useState<Commitment | null>(null);
  const [historyCommitment, setHistoryCommitment] = useState<Commitment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const data = await getCalendarData(supabase, {
        view,
        date: selectedDate,
        year: selectedYear,
        month: selectedMonth,
        filterCommitmentId,
      });
      setCalendarData(data);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [view, selectedDate, selectedYear, selectedMonth, filterCommitmentId]);

  useEffect(() => {
    let isMounted = true;
    const fetchCalendar = async () => {
      try {
        const supabase = getSupabase();
        const data = await getCalendarData(supabase, {
          view,
          date: selectedDate,
          year: selectedYear,
          month: selectedMonth,
          filterCommitmentId,
        });
        if (isMounted) {
          setCalendarData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch calendar data:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchCalendar();

    return () => {
      isMounted = false;
    };
  }, [view, selectedDate, selectedYear, selectedMonth, filterCommitmentId]);

  // Real-time subscription for completions and commitments sync
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("mobile:calendar:sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_completions",
        },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commitments",
        },
        () => {
          void loadData();
        },
      )
      .subscribe();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void loadData();
      }
    });

    return () => {
      appStateSub.remove();
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const mycStartedAt = calendarData?.mycStartedAt;
  const todayDate = calendarData?.todayDate || new Date().toISOString().slice(0, 10);
  const startYear = mycStartedAt ? Number(mycStartedAt.slice(0, 4)) : selectedYear;
  const currentYear = Number(todayDate.slice(0, 4));

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const yr = Number(date.slice(0, 4));
    const mo = Number(date.slice(5, 7));
    setSelectedYear(yr);
    setSelectedMonth(mo);
    setView("day");
  };

  const handlePrev = () => {
    if (view === "year") {
      const nextY = selectedYear - 1;
      if (nextY >= startYear) {
        setSelectedYear(nextY);
        setSelectedDate(`${nextY}-01-01`);
      }
    } else if (view === "month") {
      let nextM = selectedMonth - 1;
      let nextY = selectedYear;
      if (nextM < 1) {
        nextM = 12;
        nextY -= 1;
      }
      setSelectedYear(nextY);
      setSelectedMonth(nextM);
      setSelectedDate(`${nextY}-${String(nextM).padStart(2, "0")}-01`);
    } else if (view === "week") {
      const prevDate = addDays(selectedDate, -7);
      setSelectedDate(prevDate);
      setSelectedYear(Number(prevDate.slice(0, 4)));
      setSelectedMonth(Number(prevDate.slice(5, 7)));
    } else {
      const prevDate = addDays(selectedDate, -1);
      setSelectedDate(prevDate);
      setSelectedYear(Number(prevDate.slice(0, 4)));
      setSelectedMonth(Number(prevDate.slice(5, 7)));
    }
  };

  const handleNext = () => {
    if (view === "year") {
      const nextY = selectedYear + 1;
      if (nextY <= currentYear) {
        setSelectedYear(nextY);
        setSelectedDate(`${nextY}-01-01`);
      }
    } else if (view === "month") {
      let nextM = selectedMonth + 1;
      let nextY = selectedYear;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      setSelectedYear(nextY);
      setSelectedMonth(nextM);
      setSelectedDate(`${nextY}-${String(nextM).padStart(2, "0")}-01`);
    } else if (view === "week") {
      const nextDate = addDays(selectedDate, 7);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
    } else {
      const nextDate = addDays(selectedDate, 1);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
    }
  };

  const handleJumpToToday = () => {
    setSelectedDate(todayDate);
    const yr = Number(todayDate.slice(0, 4));
    const mo = Number(todayDate.slice(5, 7));
    setSelectedYear(yr);
    setSelectedMonth(mo);
    setView("day");
  };

  const maxScheduledYear = Math.max(
    currentYear + 1,
    ...(calendarData?.commitments || [])
      .filter((c) => c.scheduled_date)
      .map((c) => Number(c.scheduled_date!.slice(0, 4))),
  );
  const maxMonthKey = `${maxScheduledYear}-12`;
  const maxDate = `${maxScheduledYear}-12-31`;

  // Bounds checks
  const isPrevDisabled = () => {
    if (!mycStartedAt) return true;
    if (view === "year") return selectedYear <= startYear;
    if (view === "month") {
      const currentMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const startMonthKey = mycStartedAt.slice(0, 7);
      return currentMonthKey <= startMonthKey;
    }
    if (view === "week") {
      const weekRange = getWeekDateRange(selectedDate);
      return weekRange.startDate <= mycStartedAt;
    }
    return selectedDate <= mycStartedAt;
  };

  const isNextDisabled = () => {
    if (!mycStartedAt) return true;
    if (view === "year") return selectedYear >= maxScheduledYear;
    if (view === "month") {
      const currentMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      return currentMonthKey >= maxMonthKey;
    }
    if (view === "week") {
      const weekRange = getWeekDateRange(selectedDate);
      return weekRange.endDate >= maxDate;
    }
    return selectedDate >= maxDate;
  };

  const periodLabel = () => {
    if (view === "year") return String(selectedYear);
    if (view === "month") return formatMonthYear(selectedYear, selectedMonth);
    if (view === "week") {
      const w = getWeekDateRange(selectedDate);
      return `${w.startDate.slice(5)} – ${w.endDate.slice(5)}`;
    }
    return formatDisplayDate(selectedDate);
  };

  const getIntensityColor = (level: number) => {
    switch (level) {
      case 1:
        return colors.intensity.level1;
      case 2:
        return colors.intensity.level2;
      case 3:
        return colors.intensity.level3;
      case 4:
        return colors.intensity.level4;
      default:
        return colors.intensity.level0;
    }
  };

  // Day view data
  const selectedDayData = calendarData?.days.find((d) => d.date === selectedDate);
  const items = selectedDayData?.items || [];
  const expected = selectedDayData?.expected ?? items.length;
  const completed = selectedDayData?.completed ?? items.filter((i) => i.isCompleted).length;
  const percentage = expected > 0 ? Math.round((completed / expected) * 100) : null;
  const isConsistent = expected > 0 ? completed === expected : null;
  const isFuture = selectedDate > todayDate;
  const isPreJourney = Boolean(mycStartedAt && selectedDate < mycStartedAt);
  const isToday = selectedDate === todayDate;
  const completedItems = items.filter((i) => i.isCompleted);

  const selectedCommitmentTitle =
    filterCommitmentId === "all"
      ? "All commitments"
      : calendarData?.commitments.find((c) => c.id === filterCommitmentId)?.title ||
        "All commitments";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CALENDAR</Text>
        <Text style={styles.title}>Your consistency, day by day</Text>
        <Text style={styles.description}>
          Every shaded day is a day you showed up. Darker means more got done.
        </Text>
      </View>

      {/* Control Bar: View Switcher & Commitment Filter Trigger */}
      <View style={styles.controlGroup}>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={(val) => setView(val as CalendarView)}
        />

        {/* Commitment Filter Dropdown Trigger Button */}
        {calendarData && calendarData.commitments.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.filterTrigger, pressed && styles.filterTriggerPressed]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={styles.filterTriggerText} numberOfLines={1}>
              {selectedCommitmentTitle}
            </Text>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Period Navigation Bar: Prev, Current Label, Next, Jump to Today */}
      <View style={styles.navBar}>
        <View style={styles.navControls}>
          <Pressable
            onPress={handlePrev}
            disabled={isPrevDisabled()}
            style={({ pressed }) => [
              styles.navIconButton,
              isPrevDisabled() && styles.navButtonDisabled,
              pressed && styles.navButtonPressed,
            ]}
          >
            <ChevronLeft
              size={18}
              color={isPrevDisabled() ? colors.mutedForeground : colors.foreground}
            />
          </Pressable>

          <Text style={styles.periodLabel}>{periodLabel()}</Text>

          <Pressable
            onPress={handleNext}
            disabled={isNextDisabled()}
            style={({ pressed }) => [
              styles.navIconButton,
              isNextDisabled() && styles.navButtonDisabled,
              pressed && styles.navButtonPressed,
            ]}
          >
            <ChevronRight
              size={18}
              color={isNextDisabled() ? colors.mutedForeground : colors.foreground}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={handleJumpToToday}
          style={({ pressed }) => [styles.todayButton, pressed && styles.todayButtonPressed]}
        >
          <RotateCcw size={14} color={colors.primary} />
          <Text style={styles.todayButtonText}>Today</Text>
        </Pressable>
      </View>

      {/* Loading indicator */}
      {loading && !refreshing && (
        <View style={{ gap: 16 }}>
          <Skeleton height={80} borderRadius={radii.xl} />
          <Skeleton height={140} borderRadius={radii.xl} />
          <Skeleton height={110} borderRadius={radii.xl} />
        </View>
      )}

      {/* Pre-journey empty state */}
      {!loading && !mycStartedAt && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <CalendarIcon size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Journey not started yet</Text>
          <Text style={styles.emptyDescription}>
            The MYC calendar begins on the exact day you create your first commitment and confirm
            &ldquo;I COMMIT&rdquo;. Pre-journey history is never fabricated.
          </Text>
          {onNavigateToCommitments && (
            <Button variant="primary" onPress={onNavigateToCommitments} style={{ marginTop: 12 }}>
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: "600", marginLeft: 6 }}>
                Define your first commitment
              </Text>
            </Button>
          )}
        </Card>
      )}

      {/* 1. DAY VIEW */}
      {!loading && mycStartedAt && view === "day" && (
        <View style={styles.viewContainer}>
          {/* Unwrapped Date Header */}
          <View style={styles.dayDateSection}>
            <View style={styles.dayDateRow}>
              <Text style={styles.dayDateTitle}>{formatDisplayDate(selectedDate)}</Text>
              {isToday && <Badge tone="sky">Today</Badge>}
              {isConsistent && <Badge tone="mint">Consistent Day</Badge>}
            </View>
            <Text style={styles.dayDateSubtitle}>
              {isFuture
                ? "Upcoming date in your MYC schedule."
                : isPreJourney
                  ? "Date preceded your official MYC journey start."
                  : expected === 0
                    ? "No commitments scheduled on this date."
                    : `${completed} of ${expected} commitments completed (${percentage ?? 0}%).`}
            </Text>
          </View>

          {/* Notices */}
          {isFuture && (
            <View style={styles.noticeWarning}>
              <Text style={styles.noticeTitle}>Future date</Text>
              <Text style={styles.noticeText}>
                Completions cannot be recorded in advance. This date unlocks when reached in your
                local timezone.
              </Text>
            </View>
          )}

          {isPreJourney && (
            <View style={styles.noticeInfo}>
              <Text style={styles.noticeTitle}>Pre-journey date</Text>
              <Text style={styles.noticeText}>
                Your MYC journey officially began on {mycStartedAt}. Dates prior to that are
                excluded from consistency scores.
              </Text>
            </View>
          )}

          {/* Scheduled Commitments Card */}
          <Card style={styles.scheduledCard}>
            <View style={styles.scheduledCardHeader}>
              <Text style={styles.scheduledCardTitle}>Scheduled Commitments</Text>
              <Text style={styles.scheduledCardCount}>
                {completed} of {expected} complete
              </Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyItemsBox}>
                <Circle size={28} color={colors.mutedForeground} opacity={0.3} />
                <Text style={styles.emptyItemsTitle}>No commitments scheduled</Text>
                <Text style={styles.emptyItemsDesc}>
                  There are no active commitments scheduled for this day of the week.
                </Text>
              </View>
            ) : (
              <View style={styles.scheduledList}>
                {items.map((item, index) => {
                  const canComplete = !item.isCompleted && !isFuture && !isPreJourney;
                  const timezone = calendarData?.profile?.timezone || "UTC";
                  const completedTime = item.completedAt
                    ? formatCompletionTimeOnly(item.completedAt, timezone)
                    : null;

                  return (
                    <View
                      key={item.commitment.id}
                      style={[
                        styles.scheduledItemRow,
                        index > 0 && styles.scheduledItemDivider,
                        item.isCompleted && styles.scheduledItemDoneBg,
                      ]}
                    >
                      <View style={styles.itemMainRow}>
                        {item.isCompleted ? (
                          <View style={styles.statusIconWrap}>
                            <CheckCircle2 size={20} color={colors.success} />
                          </View>
                        ) : (
                          <Pressable
                            disabled={!canComplete}
                            onPress={() => setCompletingCommitment(item.commitment)}
                            style={styles.statusIconWrap}
                            hitSlop={6}
                          >
                            <Circle
                              size={20}
                              color={canComplete ? colors.mutedForeground : colors.border}
                            />
                          </Pressable>
                        )}

                        <View style={styles.itemTextContent}>
                          <Text
                            style={[styles.itemTitle, item.isCompleted && styles.itemTitleDone]}
                          >
                            {item.commitment.title}
                          </Text>
                          {item.commitment.description ? (
                            <Text style={styles.itemDesc} numberOfLines={2}>
                              {item.commitment.description}
                            </Text>
                          ) : null}

                          <View style={styles.itemMetaRow}>
                            <Text style={styles.itemFrequencyText}>
                              {formatFrequency(
                                item.commitment.frequency,
                                item.commitment.schedule_days,
                                item.commitment.scheduled_date,
                              )}
                            </Text>
                            {completedTime && (
                              <View style={styles.timeTag}>
                                <Clock size={11} color={colors.success} />
                                <Text style={styles.timeTagText}>Completed at {completedTime}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.itemRightActions}>
                          {item.isCompleted ? (
                            <Badge tone="mint">Done</Badge>
                          ) : (
                            <Badge tone="outline">Pending</Badge>
                          )}

                          <Pressable
                            onPress={() => setHistoryCommitment(item.commitment)}
                            style={styles.historyIconBtn}
                            hitSlop={8}
                          >
                            <History size={16} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Comment quote box if present */}
                      {item.isCompleted && item.comment && (
                        <View style={styles.quoteBox}>
                          <MessageSquare
                            size={13}
                            color={colors.mutedForeground}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.quoteText}>&ldquo;{item.comment}&rdquo;</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Day Activity Card */}
          <Card style={styles.activityCard}>
            <View style={styles.activityCardHeader}>
              <View style={styles.activityTitleGroup}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={styles.activityCardTitle}>Day Activity</Text>
              </View>
              <Text style={styles.activityCardCount}>
                {completedItems.length} recorded session{completedItems.length === 1 ? "" : "s"}
              </Text>
            </View>

            {completedItems.length === 0 ? (
              <View style={styles.activityEmptyBox}>
                <Text style={styles.activityEmptyTitle}>No activity recorded yet</Text>
                <Text style={styles.activityEmptyDesc}>
                  Completions submitted for {formatDisplayDate(selectedDate)} will be permanently
                  listed here with their submission times and notes.
                </Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {completedItems.map((item) => {
                  const timezone = calendarData?.profile?.timezone || "UTC";
                  const completedTime = item.completedAt
                    ? formatCompletionTimeOnly(item.completedAt, timezone)
                    : null;

                  return (
                    <View key={`act-${item.commitment.id}`} style={styles.activityItemCard}>
                      <View style={styles.activityItemHeader}>
                        <Text style={styles.activityItemTitle}>{item.commitment.title}</Text>
                        {completedTime && (
                          <View style={styles.activityTimeWrap}>
                            <Clock size={12} color={colors.mutedForeground} />
                            <Text style={styles.activityTimeText}>{completedTime}</Text>
                          </View>
                        )}
                      </View>

                      {item.comment ? (
                        <View style={styles.activityQuoteBox}>
                          <MessageSquare
                            size={13}
                            color={colors.mutedForeground}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.activityQuoteText}>&ldquo;{item.comment}&rdquo;</Text>
                        </View>
                      ) : (
                        <Text style={styles.noNoteText}>No note added for this completion.</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Day Consistency Card */}
          <Card style={styles.consistencyCard}>
            <ProgressRing
              value={percentage ?? 0}
              size={140}
              strokeWidth={12}
              color={colors.primary}
            >
              <Text style={styles.ringValueText}>
                {percentage !== null ? `${percentage}%` : "—"}
              </Text>
              <Text style={styles.ringSubText}>
                {percentage !== null ? "completed" : "unscheduled"}
              </Text>
            </ProgressRing>

            <View style={styles.consistencyMetaBox}>
              <Text style={styles.consistencyTitle}>Day Consistency</Text>
              <Text style={styles.consistencyDesc}>
                {expected > 0
                  ? `${completed} of ${expected} scheduled commitments kept.`
                  : "No commitments required on this day."}
              </Text>
            </View>

            {percentage !== null && (
              <View style={{ width: "100%", marginTop: 8 }}>
                <ProgressBar
                  value={percentage}
                  height={8}
                  color={colors.primary}
                  backgroundColor="#E2E8F0"
                />
              </View>
            )}
          </Card>
        </View>
      )}

      {/* 2. WEEK VIEW */}
      {!loading && mycStartedAt && view === "week" && (
        <View style={styles.viewContainer}>
          {calendarData && (
            <Card style={styles.periodSummaryCard}>
              <Text style={styles.summaryTitle}>
                {calendarData.periodSummary.consistentDays} consistent days
              </Text>
              <Text style={styles.summarySub}>
                {calendarData.periodSummary.completionPercentage !== null
                  ? `${calendarData.periodSummary.completionPercentage}% weekly completion (${calendarData.periodSummary.totalCompletedInstances}/${calendarData.periodSummary.totalEligibleInstances} kept)`
                  : "No commitments scheduled"}
              </Text>
            </Card>
          )}

          {calendarData?.days.map((day) => {
            const isInteractive = !day.isPreJourney;
            const weekdayName = WEEKDAYS[day.isoWeekday - 1] ?? "Day";
            const isSelected = day.date === selectedDate;

            return (
              <Pressable
                key={day.date}
                disabled={!isInteractive}
                onPress={() => handleSelectDate(day.date)}
              >
                <Card
                  style={[
                    styles.weekDayCard,
                    day.isToday && styles.weekDayCardToday,
                    isSelected && styles.weekDayCardSelected,
                    !isInteractive && styles.weekDayCardDisabled,
                  ]}
                >
                  <View style={styles.weekDayTop}>
                    <View>
                      <Text style={styles.weekDayName}>{weekdayName}</Text>
                      <Text style={styles.weekDayDate}>{formatDisplayDate(day.date)}</Text>
                    </View>
                    <View style={styles.badgesRow}>
                      {day.isToday && <Badge tone="sky">Today</Badge>}
                      {day.isConsistent && <Badge tone="mint">Consistent</Badge>}
                      {day.isFuture && <Badge tone="sun">Upcoming</Badge>}
                    </View>
                  </View>

                  <View style={styles.weekDayBottom}>
                    <View
                      style={[
                        styles.intensityDot,
                        { backgroundColor: getIntensityColor(day.intensity) },
                      ]}
                    />
                    <Text style={styles.weekDayRatio}>
                      {day.expected > 0
                        ? `${day.completed} / ${day.expected} done (${day.percentage}%)`
                        : "No commitments scheduled"}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 3. MONTH VIEW */}
      {!loading && mycStartedAt && view === "month" && (
        <View style={styles.viewContainer}>
          {calendarData && (
            <View style={styles.statsRow}>
              <StatCard
                label="Consistent days"
                value={String(calendarData.periodSummary.consistentDays)}
                unit="days"
                tone="mint"
              />
              <StatCard
                label="Month score"
                value={
                  calendarData.periodSummary.completionPercentage !== null
                    ? `${calendarData.periodSummary.completionPercentage}%`
                    : "N/A"
                }
                tone="sky"
              />
            </View>
          )}

          <Card style={styles.monthCard}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthTitle}>{formatMonthYear(selectedYear, selectedMonth)}</Text>
              <Text style={styles.monthHint}>Tap a day for details</Text>
            </View>

            <View style={styles.weekdayHeadersRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayHeaderLabel}>
                  {w[0]}
                </Text>
              ))}
            </View>

            <View style={styles.monthGrid}>
              {calendarData?.days[0] &&
                Array.from({ length: calendarData.days[0].isoWeekday - 1 }, (_, i) => (
                  <View key={`blank-${i}`} style={styles.monthDayCellBlank} />
                ))}

              {calendarData?.days.map((day) => {
                const isInteractive = !day.isPreJourney;
                const isSelected = day.date === selectedDate;
                const cellBg = getIntensityColor(day.intensity);

                return (
                  <Pressable
                    key={day.date}
                    disabled={!isInteractive}
                    onPress={() => handleSelectDate(day.date)}
                    style={[
                      styles.monthDayCell,
                      { backgroundColor: cellBg },
                      day.isToday && styles.monthDayCellToday,
                      isSelected && styles.monthDayCellSelected,
                      !isInteractive && styles.monthDayCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthDayNumber,
                        day.intensity >= 3 && styles.monthDayNumberDark,
                        !isInteractive && styles.monthDayNumberDisabled,
                      ]}
                    >
                      {day.dayOfMonth}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legendContainer}>
              <Text style={styles.legendLabel}>Less</Text>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <View
                  key={lvl}
                  style={[styles.legendSwatch, { backgroundColor: getIntensityColor(lvl) }]}
                />
              ))}
              <Text style={styles.legendLabel}>More</Text>
            </View>
          </Card>
        </View>
      )}

      {/* 4. YEAR VIEW */}
      {!loading && mycStartedAt && view === "year" && (
        <View style={styles.viewContainer}>
          {calendarData && (
            <View style={styles.statsRow}>
              <StatCard
                label="Consistent days"
                value={String(calendarData.periodSummary.consistentDays)}
                unit="days"
                tone="mint"
              />
              <StatCard
                label="Year score"
                value={
                  calendarData.periodSummary.completionPercentage !== null
                    ? `${calendarData.periodSummary.completionPercentage}%`
                    : "N/A"
                }
                tone="sky"
              />
            </View>
          )}

          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const monthDays = calendarData?.days.filter((d) => d.month === m) || [];
            if (monthDays.length === 0) return null;

            return (
              <Card key={m} style={styles.yearMonthCard}>
                <Text style={styles.yearMonthTitle}>{formatMonthYear(selectedYear, m)}</Text>

                <View style={styles.yearMonthGrid}>
                  {monthDays[0] &&
                    Array.from({ length: monthDays[0].isoWeekday - 1 }, (_, idx) => (
                      <View key={`b-${idx}`} style={styles.yearMiniCellBlank} />
                    ))}

                  {monthDays.map((day) => {
                    const isInteractive = !day.isPreJourney;
                    return (
                      <Pressable
                        key={day.date}
                        disabled={!isInteractive}
                        onPress={() => handleSelectDate(day.date)}
                        style={[
                          styles.yearMiniCell,
                          { backgroundColor: getIntensityColor(day.intensity) },
                          day.isToday && styles.yearMiniCellToday,
                        ]}
                      />
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Filter Selection Modal */}
      <RNModal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.filterModalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.filterModalTitle}>Filter by commitment</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Pressable
                style={[
                  styles.filterOptionRow,
                  filterCommitmentId === "all" && styles.filterOptionRowActive,
                ]}
                onPress={() => {
                  setFilterCommitmentId("all");
                  setFilterModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterCommitmentId === "all" && styles.filterOptionTextActive,
                  ]}
                >
                  All commitments
                </Text>
                {filterCommitmentId === "all" && <Check size={16} color={colors.primary} />}
              </Pressable>

              {calendarData?.commitments.map((c) => {
                const isSelected = filterCommitmentId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.filterOptionRow, isSelected && styles.filterOptionRowActive]}
                    onPress={() => {
                      setFilterCommitmentId(c.id);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text
                      style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </RNModal>

      {/* Completion Modal */}
      <CompleteCommitmentModal
        visible={Boolean(completingCommitment)}
        commitment={completingCommitment}
        date={selectedDate}
        onClose={() => setCompletingCommitment(null)}
        onSuccess={() => {
          setCompletingCommitment(null);
          loadData();
        }}
      />

      {/* History Modal */}
      <CommitmentHistoryModal
        visible={Boolean(historyCommitment)}
        commitment={historyCommitment}
        timezone={calendarData?.profile?.timezone || "UTC"}
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  controlGroup: {
    gap: 10,
  },
  filterTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadows.raised,
  },
  filterTriggerPressed: {
    backgroundColor: colors.secondary,
  },
  filterTriggerText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  filterModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 16,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 12,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  filterOptionRowActive: {
    backgroundColor: colors.secondary,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.foreground,
  },
  filterOptionTextActive: {
    fontWeight: "600",
    color: colors.primary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.raised,
  },
  navControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navIconButton: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonPressed: {
    backgroundColor: colors.secondary,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: 4,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  todayButtonPressed: {
    backgroundColor: colors.secondary,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  viewContainer: {
    gap: 16,
  },
  dayDateSection: {
    gap: 4,
  },
  dayDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dayDateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  dayDateSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  noticeWarning: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#FCD34D",
    gap: 4,
  },
  noticeInfo: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 4,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  noticeText: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  scheduledCard: {
    padding: 16,
    gap: 12,
  },
  scheduledCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  scheduledCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  scheduledCardCount: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyItemsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyItemsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  emptyItemsDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  scheduledList: {
    gap: 8,
  },
  scheduledItemRow: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  scheduledItemDivider: {
    marginTop: 4,
  },
  scheduledItemDoneBg: {
    backgroundColor: "#F0FDF4",
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statusIconWrap: {
    marginTop: 2,
  },
  itemTextContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  itemTitleDone: {
    color: colors.mutedForeground,
    textDecorationLine: "line-through",
  },
  itemDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  itemFrequencyText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: "500",
  },
  itemRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyIconBtn: {
    padding: 4,
  },
  quoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: 8,
    marginTop: 4,
  },
  quoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.foreground,
    fontStyle: "italic",
    lineHeight: 16,
  },
  activityCard: {
    padding: 16,
    gap: 12,
  },
  activityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  activityTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activityCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  activityCardCount: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  activityEmptyBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  activityEmptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  activityEmptyDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 16,
  },
  activityList: {
    gap: 8,
  },
  activityItemCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
    backgroundColor: colors.card,
  },
  activityItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  activityTimeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityTimeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  activityQuoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    padding: 8,
  },
  activityQuoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.foreground,
    fontStyle: "italic",
    lineHeight: 16,
  },
  noNoteText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  consistencyCard: {
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  ringValueText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.foreground,
  },
  ringSubText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  consistencyMetaBox: {
    alignItems: "center",
    gap: 4,
  },
  consistencyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  consistencyDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  periodSummaryCard: {
    padding: 16,
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
  weekDayCard: {
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  weekDayCardToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  weekDayCardSelected: {
    backgroundColor: colors.primarySoft,
  },
  weekDayCardDisabled: {
    opacity: 0.5,
  },
  weekDayTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekDayName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
  },
  weekDayDate: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  weekDayBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  intensityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  weekDayRatio: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
  },
  monthCard: {
    padding: 16,
    gap: 12,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  monthHint: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  weekdayHeadersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekdayHeaderLabel: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  monthDayCellBlank: {
    width: 36,
    height: 36,
  },
  monthDayCell: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  monthDayCellSelected: {
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  monthDayCellDisabled: {
    opacity: 0.3,
  },
  monthDayNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  monthDayNumberDark: {
    color: "#FFFFFF",
  },
  monthDayNumberDisabled: {
    color: colors.mutedForeground,
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 8,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  yearMonthCard: {
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  yearMonthTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  yearMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  yearMiniCellBlank: {
    width: 8,
    height: 8,
  },
  yearMiniCell: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
  yearMiniCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
