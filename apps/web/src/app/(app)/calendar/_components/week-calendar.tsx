"use client";

import { cn } from "cn";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";

import type { CalendarDayData, PeriodSummary } from "@myc/types";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { CalendarLegend } from "./calendar-legend";

const weekdayFullNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface WeekCalendarProps {
  days: CalendarDayData[];
  selectedDate: string;
  periodSummary: PeriodSummary;
  onSelectDate: (date: string) => void;
}

export function WeekCalendar({
  days,
  selectedDate,
  periodSummary,
  onSelectDate,
}: WeekCalendarProps) {
  const weekStart = days[0]?.date || "";
  const weekEnd = days[days.length - 1]?.date || "";

  return (
    <div className="flex flex-col gap-6">
      {/* Week Header & Legend */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="type-h3">
            Week of {weekStart} – {weekEnd}
          </h2>
          <p className="type-small text-muted-foreground">
            {periodSummary.consistentDays} consistent days ·{" "}
            {periodSummary.completionPercentage !== null
              ? `${periodSummary.completionPercentage}% weekly completion`
              : "No scheduled commitments"}
          </p>
        </div>
        <CalendarLegend />
      </div>

      {/* 7-Day Columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const isInteractive = !day.isFuture && !day.isPreJourney;
          const weekdayName = weekdayFullNames[day.isoWeekday - 1] ?? "Day";

          return (
            <Card
              key={day.date}
              onClick={() => {
                if (isInteractive) onSelectDate(day.date);
              }}
              className={cn(
                "group/day flex flex-col justify-between p-4 transition-all",
                isInteractive
                  ? "cursor-pointer hover:border-primary/50 hover:shadow-raised"
                  : "cursor-not-allowed border-dashed bg-muted/20 opacity-60",
                day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                isSelected && "border-foreground bg-accent/30",
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="type-caption font-bold text-foreground">{weekdayName}</span>
                  {day.isToday && (
                    <Badge tone="sky" className="px-1.5 py-0 text-[10px]">
                      Today
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="type-h2 tabular-nums">{day.dayOfMonth}</span>
                  <span className="type-caption text-muted-foreground">{day.date.slice(5, 7)}</span>
                </div>

                {/* Status pill */}
                <div className="mt-1">
                  {day.isFuture ? (
                    <Badge tone="outline" className="text-[10px] text-muted-foreground/60">
                      Upcoming
                    </Badge>
                  ) : day.isPreJourney ? (
                    <Badge tone="outline" className="text-[10px] text-muted-foreground/50">
                      Pre-journey
                    </Badge>
                  ) : day.expected === 0 ? (
                    <Badge tone="outline" className="text-[10px] text-muted-foreground">
                      No schedule
                    </Badge>
                  ) : day.isConsistent ? (
                    <Badge tone="success" className="text-[10px]">
                      100% Consistent
                    </Badge>
                  ) : (
                    <Badge tone="neutral" className="text-[10px]">
                      {day.completed}/{day.expected} ({day.percentage}%)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Commitments checklist preview */}
              <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
                {day.items && day.items.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {day.items.map((item) => (
                      <li
                        key={item.commitment.id}
                        className="flex items-center gap-2 text-[12px] leading-tight text-foreground/90"
                      >
                        {item.isCompleted ? (
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <CircleIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            item.isCompleted && "text-muted-foreground line-through",
                          )}
                        >
                          {item.commitment.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    {day.isFuture
                      ? "Future date"
                      : day.isPreJourney
                        ? "Before journey"
                        : "No commitments"}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
