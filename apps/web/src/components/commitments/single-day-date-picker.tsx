"use client";

import { cn } from "cn";
import {
  CalendarCheck2Icon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatCommitmentDate,
  formatDisplayDate,
  formatMonthYear,
  getDateRange,
  getIsoWeekday,
  getMonthDateRange,
  getUserLocalDateString,
} from "@myc/utils";

import { Button } from "@/components/ui/button";

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

export interface SingleDayDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  userTimezone?: string;
  error?: string;
}

export function SingleDayDatePicker({
  value,
  onChange,
  userTimezone,
  error,
}: SingleDayDatePickerProps) {
  const todayDate = useMemo(() => getUserLocalDateString(userTimezone), [userTimezone]);

  const initialParts = useMemo(() => {
    const baseDate = value && value >= todayDate ? value : todayDate;
    const parts = baseDate.split("-").map(Number);
    return {
      year: parts[0] ?? new Date().getFullYear(),
      month: parts[1] ?? new Date().getMonth() + 1,
    };
  }, [value, todayDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialParts.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialParts.month);

  const todayParts = useMemo(() => {
    const parts = todayDate.split("-").map(Number);
    return {
      year: parts[0] ?? new Date().getFullYear(),
      month: parts[1] ?? new Date().getMonth() + 1,
    };
  }, [todayDate]);

  const isPrevDisabled =
    currentYear < todayParts.year ||
    (currentYear === todayParts.year && currentMonth <= todayParts.month);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    setCurrentYear(todayParts.year);
    setCurrentMonth(todayParts.month);
    onChange(todayDate);
  };

  const { days, leadingBlanks } = useMemo(() => {
    const monthRange = getMonthDateRange(currentYear, currentMonth);
    const firstDayWeekday = getIsoWeekday(monthRange.startDate);
    const blanks = firstDayWeekday - 1;
    const allDays = getDateRange(monthRange.startDate, monthRange.endDate);
    return { days: allDays, leadingBlanks: blanks };
  }, [currentYear, currentMonth]);

  const monthLabel = formatMonthYear(currentYear, currentMonth);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-raised">
        {/* Calendar Navigation Header */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-primary" />
            <span className="type-base font-semibold text-foreground">{monthLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSelectToday}
              className="rounded-lg px-2 py-1 type-caption font-semibold text-primary transition-colors hover:bg-primary-soft/50"
            >
              Today
            </button>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handlePrevMonth}
                disabled={isPrevDisabled}
                aria-label="Previous month"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Weekday Labels Header */}
        <div
          aria-hidden="true"
          className="grid grid-cols-7 gap-1 border-b border-border/50 pb-1.5 text-center"
        >
          {WEEKDAY_HEADERS.map((letter, idx) => (
            <span
              key={`weekday-${idx}`}
              className="type-caption font-semibold text-muted-foreground"
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Day Buttons Grid */}
        <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 pt-1.5">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden="true" className="size-8 sm:size-9" />
          ))}

          {days.map((d) => {
            const dayNum = Number(d.split("-")[2]);
            const isPast = d < todayDate;
            const isSelected = d === value;
            const isToday = d === todayDate;

            return (
              <button
                key={d}
                type="button"
                disabled={isPast}
                onClick={() => onChange(d)}
                aria-label={formatDisplayDate(d)}
                aria-pressed={isSelected}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl type-caption font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9",
                  isPast &&
                    "cursor-not-allowed text-muted-foreground/35 opacity-40 hover:bg-transparent",
                  !isPast && !isSelected && !isToday && "text-foreground hover:bg-secondary",
                  isToday &&
                    !isSelected &&
                    "border border-primary/60 font-semibold text-primary hover:bg-primary-soft/40",
                  isSelected && "bg-primary font-bold text-primary-foreground shadow-raised",
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Feedback / Empty State */}
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2 type-small transition-colors",
          value
            ? "border-primary/30 bg-primary-soft/30 text-foreground"
            : "border-border/80 bg-secondary/60 text-muted-foreground",
        )}
      >
        {value ? (
          <>
            <CalendarCheck2Icon className="size-4 shrink-0 text-primary" />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-1">
              <span>
                Scheduled for:{" "}
                <strong className="font-semibold text-foreground">
                  {formatCommitmentDate(value)}
                </strong>
                {value === todayDate && (
                  <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 type-caption font-semibold text-primary-soft-foreground">
                    <SparklesIcon className="size-3" /> Today
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onChange("")}
                className="type-caption text-muted-foreground underline-offset-4 hover:underline"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground/60" />
            <span>No date selected. Choose today or any future date above.</span>
          </>
        )}
      </div>

      {error && <p className="type-small font-medium text-destructive">{error}</p>}
    </div>
  );
}
