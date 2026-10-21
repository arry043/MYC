import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCommitmentDate, formatMonthYear, getUserLocalDateString } from "@myc/utils";

import { colors, radii } from "@/lib/theme";

export interface SingleDayDatePickerProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  timezone?: string;
  error?: string;
}

const WEEKDAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

export function SingleDayDatePicker({
  selectedDate,
  onSelectDate,
  timezone = "UTC",
  error,
}: SingleDayDatePickerProps) {
  const todayDate = getUserLocalDateString(timezone);
  const todayYear = Number(todayDate.slice(0, 4));
  const todayMonth = Number(todayDate.slice(5, 7));

  const initialYear = selectedDate ? Number(selectedDate.slice(0, 4)) : todayYear;
  const initialMonth = selectedDate ? Number(selectedDate.slice(5, 7)) : todayMonth;

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;
  const isPastMonth = viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);

  const handlePrevMonth = () => {
    if (isCurrentMonth || isPastMonth) return;
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleTodayShortcut = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    onSelectDate(todayDate);
  };

  // Calendar calculations (Monday = 0, Sunday = 6)
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const firstDayOfWeek = (new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay() + 6) % 7;

  const days: { date: string; dayNum: number; isPast: boolean; isToday: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      dayNum: day,
      isPast: dateStr < todayDate,
      isToday: dateStr === todayDate,
    });
  }

  return (
    <View style={styles.container}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CalendarIcon size={16} color={colors.primary} />
          <Text style={styles.monthTitle}>{formatMonthYear(viewYear, viewMonth)}</Text>
        </View>

        <View style={styles.headerNav}>
          <Pressable
            onPress={handlePrevMonth}
            disabled={isCurrentMonth || isPastMonth}
            style={[styles.navButton, (isCurrentMonth || isPastMonth) && styles.navButtonDisabled]}
            hitSlop={6}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft
              size={16}
              color={isCurrentMonth || isPastMonth ? colors.mutedForeground : colors.foreground}
            />
          </Pressable>

          <Pressable
            onPress={handleTodayShortcut}
            style={styles.todayShortcut}
            hitSlop={6}
            accessibilityLabel="Jump to today"
          >
            <RotateCcw size={12} color={colors.primary} />
            <Text style={styles.todayShortcutText}>Today</Text>
          </Pressable>

          <Pressable
            onPress={handleNextMonth}
            style={styles.navButton}
            hitSlop={6}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={16} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Weekday Names Row */}
      <View style={styles.weekdaysRow}>
        {WEEKDAY_NAMES.map((name, index) => (
          <View key={`wk-${index}`} style={styles.cellWrap}>
            <Text style={styles.weekdayText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {Array.from({ length: firstDayOfWeek }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.cellWrap} />
        ))}

        {days.map((item) => {
          const isSelected = item.date === selectedDate;

          return (
            <View key={item.date} style={styles.cellWrap}>
              <Pressable
                onPress={() => onSelectDate(item.date)}
                disabled={item.isPast}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  item.isToday && !isSelected && styles.dayButtonToday,
                  item.isPast && styles.dayButtonDisabled,
                ]}
                accessibilityLabel={`${item.date}${item.isPast ? ", past date" : ""}${isSelected ? ", selected" : ""}`}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    item.isToday && !isSelected && styles.dayTextToday,
                    item.isPast && styles.dayTextDisabled,
                  ]}
                >
                  {item.dayNum}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Selected Date Summary / Empty State */}
      <View style={styles.footerWrap}>
        {selectedDate ? (
          <View style={styles.selectedBox}>
            <CheckCircle2 size={15} color={colors.tones.sky.text} />
            <Text style={styles.selectedText}>
              Scheduled for:{" "}
              <Text style={styles.selectedBold}>{formatCommitmentDate(selectedDate)}</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <CalendarIcon size={14} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              Select a date from today onward for this commitment
            </Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  todayShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.tones.sky.bg,
  },
  todayShortcutText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cellWrap: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  dayButton: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayButtonDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: colors.mutedForeground,
  },
  footerWrap: {
    marginTop: 2,
    gap: 6,
  },
  selectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.tones.sky.bg,
    borderColor: colors.tones.sky.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedText: {
    fontSize: 12,
    color: colors.tones.sky.text,
  },
  selectedBold: {
    fontWeight: "700",
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    marginTop: 2,
  },
});
