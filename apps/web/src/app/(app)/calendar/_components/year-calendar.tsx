"use client";

import { cn } from "cn";
import { CalendarCheck2Icon, CheckCircle2Icon, FlameIcon, TargetIcon } from "lucide-react";
import { useMemo } from "react";

import type { CalendarDayData, PeriodSummary } from "@myc/types";
import { formatDisplayDate, INTENSITY_LEVEL_CLASSES } from "@myc/utils";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

import { CalendarLegend } from "./calendar-legend";

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface YearCalendarProps {
  year: number;
  days: CalendarDayData[];
  selectedDate: string;
  mycStartedAt: string | null;
  periodSummary: PeriodSummary;
  onSelectDate: (date: string) => void;
}

export function YearCalendar({
  year,
  days,
  selectedDate,
  mycStartedAt,
  periodSummary,
  onSelectDate,
}: YearCalendarProps) {
  // Group days by month (1..12)
  const daysByMonth = useMemo(() => {
    const map = new Map<number, CalendarDayData[]>();
    for (let m = 1; m <= 12; m++) {
      map.set(m, []);
    }
    for (const d of days) {
      const list = map.get(d.month);
      if (list) {
        list.push(d);
      }
    }
    return map;
  }, [days]);

  return (
    <div className="flex flex-col gap-6">
      {/* Selected Year Summary */}
      <div className="grid grid-cols-2 gap-stack lg:grid-cols-4">
        <StatCard
          label={`Consistent days (${year})`}
          value={String(periodSummary.consistentDays)}
          unit="days"
          icon={CalendarCheck2Icon}
          tone="mint"
        />
        <StatCard
          label={`Year completion (${year})`}
          value={
            periodSummary.completionPercentage !== null
              ? `${periodSummary.completionPercentage}%`
              : "N/A"
          }
          icon={TargetIcon}
          tone="sky"
        />
        <StatCard
          label={`Completed instances (${year})`}
          value={String(periodSummary.totalCompletedInstances)}
          unit="tasks"
          icon={CheckCircle2Icon}
          tone="lavender"
        />
        <StatCard
          label={`Scheduled instances (${year})`}
          value={String(periodSummary.totalEligibleInstances)}
          unit="tasks"
          icon={FlameIcon}
          tone="peach"
        />
      </div>

      {/* Main Year Contribution Grid */}
      <Card className="gap-6 p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="type-h3">{year} Contribution Calendar</CardTitle>
            <CardDescription>
              {mycStartedAt
                ? `Journey began ${mycStartedAt}. Shaded cells represent completed commitments.`
                : "Journey not started yet."}
            </CardDescription>
          </div>
          <CalendarLegend />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {monthNames.map((name, index) => {
            const monthNumber = index + 1;
            const monthDays = daysByMonth.get(monthNumber) || [];
            if (monthDays.length === 0) return null;

            // Calculate leading blanks from the 1st day's ISO weekday
            const firstDay = monthDays[0];
            const leadingBlanks = firstDay ? firstDay.isoWeekday - 1 : 0;

            return (
              <div
                key={name}
                className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="type-caption font-semibold text-foreground">{name}</span>
                  <span className="type-caption text-muted-foreground">
                    {monthDays.filter((d) => d.isConsistent).length} consistent
                  </span>
                </div>

                {/* Weekday headers */}
                <div aria-hidden className="grid grid-cols-7 gap-1 text-center">
                  {weekdayLabels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className="type-caption text-[10px] font-medium text-muted-foreground/75"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>

                {/* Days grid */}
                <ol className="grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }, (_, bIdx) => (
                    <li key={`blank-${bIdx}`} aria-hidden />
                  ))}

                  {monthDays.map((day) => {
                    const isSelected = day.date === selectedDate;
                    const isInteractive = !day.isPreJourney;

                    const tooltipText = day.isFuture
                      ? `${day.date}: Upcoming date`
                      : day.isPreJourney
                        ? `${day.date}: Prior to MYC journey start`
                        : day.expected === 0
                          ? `${formatDisplayDate(day.date)}: No commitments scheduled`
                          : `${formatDisplayDate(day.date)} — ${day.completed} of ${day.expected} done (${day.percentage}%)${day.isConsistent ? " ✓ Fully consistent" : ""}`;

                    return (
                      <li key={day.date} className="group/cell relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (isInteractive) onSelectDate(day.date);
                          }}
                          disabled={!isInteractive}
                          aria-label={tooltipText}
                          className={cn(
                            "relative flex aspect-square w-full items-center justify-center rounded-[5px] text-[10px] font-semibold transition-all",
                            day.isFuture
                              ? "cursor-not-allowed border border-dashed border-border/50 bg-background/50 text-muted-foreground/40"
                              : day.isPreJourney
                                ? "cursor-not-allowed border border-border/30 bg-muted/40 text-muted-foreground/30"
                                : cn(
                                    INTENSITY_LEVEL_CLASSES[day.intensity],
                                    "cursor-pointer hover:ring-2 hover:ring-primary/60 hover:ring-offset-1 hover:ring-offset-card",
                                  ),
                            day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                            isSelected && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                          )}
                        >
                          <span className="sr-only">{tooltipText}</span>
                          <span
                            aria-hidden
                            className={cn(
                              day.intensity === 4 ? "text-white" : "text-foreground/80",
                              day.isFuture && "text-muted-foreground/30",
                            )}
                          >
                            {day.dayOfMonth}
                          </span>

                          {/* Hover Tooltip */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 type-caption font-medium whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100 max-sm:hidden"
                          >
                            <span className="block font-bold">{day.date}</span>
                            <span className="block text-[11px] text-background/90">
                              {day.isFuture
                                ? "Upcoming date"
                                : day.isPreJourney
                                  ? "Prior to MYC journey"
                                  : day.expected === 0
                                    ? "No commitments scheduled"
                                    : `${day.completed}/${day.expected} completed (${day.percentage}%)`}
                            </span>
                            {!day.isFuture &&
                              !day.isPreJourney &&
                              day.expected > 0 &&
                              (day.isConsistent ? (
                                <span className="block text-[10px] text-emerald-300">
                                  ✓ Consistent day
                                </span>
                              ) : (
                                <span className="block text-[10px] text-rose-300">
                                  Not fully consistent
                                </span>
                              ))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
