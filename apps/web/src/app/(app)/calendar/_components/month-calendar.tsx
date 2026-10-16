"use client";

import { cn } from "cn";
import { CalendarCheck2Icon, CheckCircle2Icon, TargetIcon } from "lucide-react";

import type { CalendarDayData, PeriodSummary } from "@myc/types";
import { formatDisplayDate, formatMonthYear, INTENSITY_LEVEL_CLASSES } from "@myc/utils";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

import { CalendarLegend } from "./calendar-legend";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthCalendarProps {
  year: number;
  month: number;
  days: CalendarDayData[];
  selectedDate: string;
  periodSummary: PeriodSummary;
  onSelectDate: (date: string) => void;
}

export function MonthCalendar({
  year,
  month,
  days,
  selectedDate,
  periodSummary,
  onSelectDate,
}: MonthCalendarProps) {
  const monthTitle = formatMonthYear(year, month);
  const firstDay = days[0];
  const leadingBlanks = firstDay ? firstDay.isoWeekday - 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Month Summary Cards */}
      <div className="grid grid-cols-1 gap-stack sm:grid-cols-3">
        <StatCard
          label={`Consistent days (${monthTitle})`}
          value={String(periodSummary.consistentDays)}
          unit="days"
          icon={CalendarCheck2Icon}
          tone="mint"
        />
        <StatCard
          label="Month consistency"
          value={
            periodSummary.completionPercentage !== null
              ? `${periodSummary.completionPercentage}%`
              : "N/A"
          }
          icon={TargetIcon}
          tone="sky"
        />
        <StatCard
          label="Instances completed"
          value={`${periodSummary.totalCompletedInstances} / ${periodSummary.totalEligibleInstances}`}
          icon={CheckCircle2Icon}
          tone="lavender"
        />
      </div>

      {/* Main Month Grid Card */}
      <Card className="gap-6 p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="type-h3">{monthTitle}</CardTitle>
            <CardDescription>
              Click any eligible date to inspect or update today&apos;s commitments.
            </CardDescription>
          </div>
          <CalendarLegend />
        </div>

        {/* Weekday headers */}
        <div aria-hidden className="grid grid-cols-7 gap-2 text-center sm:gap-3">
          {weekdays.map((day) => (
            <span
              key={day}
              className="type-caption font-semibold tracking-wider text-muted-foreground uppercase"
            >
              <span className="sm:hidden">{day[0]}</span>
              <span className="max-sm:hidden">{day}</span>
            </span>
          ))}
        </div>

        {/* Month days grid */}
        <ol className="grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <li key={`blank-${index}`} aria-hidden />
          ))}

          {days.map((day) => {
            const isSelected = day.date === selectedDate;
            const isInteractive = !day.isFuture && !day.isPreJourney;

            const tooltipText = day.isFuture
              ? `${day.date}: Upcoming date`
              : day.isPreJourney
                ? `${day.date}: Prior to MYC journey start`
                : day.expected === 0
                  ? `${formatDisplayDate(day.date)}: No commitments scheduled`
                  : `${formatDisplayDate(day.date)} — ${day.completed} of ${day.expected} done (${day.percentage}%)${day.isConsistent ? " ✓ Fully consistent" : ""}`;

            return (
              <li key={day.date} className="group/day relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isInteractive) onSelectDate(day.date);
                  }}
                  disabled={!isInteractive}
                  aria-label={tooltipText}
                  className={cn(
                    "flex aspect-square w-full flex-col items-start justify-between rounded-xl p-2 text-left transition-all sm:p-3",
                    day.isFuture
                      ? "cursor-not-allowed border border-dashed border-border/60 bg-background/50 text-muted-foreground/40"
                      : day.isPreJourney
                        ? "cursor-not-allowed border border-border/40 bg-muted/30 text-muted-foreground/30"
                        : cn(
                            INTENSITY_LEVEL_CLASSES[day.intensity],
                            "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/60 hover:ring-offset-2 hover:ring-offset-card",
                          ),
                    day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                    isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                  )}
                >
                  <span className="sr-only">{tooltipText}</span>

                  <div className="flex w-full items-center justify-between">
                    <span
                      aria-hidden
                      className={cn(
                        "type-caption font-bold tabular-nums",
                        day.intensity === 4 ? "text-white" : "text-foreground",
                        day.isFuture && "text-muted-foreground/40",
                      )}
                    >
                      {day.dayOfMonth}
                    </span>

                    {day.isToday && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground uppercase max-sm:hidden">
                        Today
                      </span>
                    )}
                  </div>

                  {!day.isFuture && !day.isPreJourney && day.expected > 0 && (
                    <div className="mt-auto w-full pt-1">
                      <span
                        className={cn(
                          "block text-[11px] leading-tight font-semibold tabular-nums",
                          day.intensity === 4 ? "text-white/90" : "text-foreground/80",
                        )}
                      >
                        {day.completed}/{day.expected}
                      </span>
                      <span
                        className={cn(
                          "block text-[9px] leading-none font-medium",
                          day.intensity === 4 ? "text-white/80" : "text-muted-foreground",
                        )}
                      >
                        {day.percentage}%
                      </span>
                    </div>
                  )}

                  {/* Tooltip */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 type-caption font-medium whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/day:opacity-100 group-focus-visible/day:opacity-100 max-sm:hidden"
                  >
                    <span className="block font-bold">{day.date}</span>
                    <span className="block text-[11px] text-background/90">
                      {day.isFuture
                        ? "Upcoming date"
                        : day.isPreJourney
                          ? "Prior to MYC journey"
                          : day.expected === 0
                            ? "No commitments scheduled"
                            : `${day.completed} of ${day.expected} completed (${day.percentage}%)`}
                    </span>
                    {!day.isFuture &&
                      !day.isPreJourney &&
                      day.expected > 0 &&
                      (day.isConsistent ? (
                        <span className="block text-[10px] text-emerald-300">✓ Consistent day</span>
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
      </Card>
    </div>
  );
}
