"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { CalendarDayData, CalendarPageData, CalendarView, DailyCompletion } from "@myc/types";
import {
  addDays,
  formatDisplayDate,
  formatMonthYear,
  getIntensityLevel,
  getWeekDateRange,
} from "@myc/utils";

import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { createClient } from "@/lib/supabase/client";

import { DayCalendar } from "./day-calendar";
import { MonthCalendar } from "./month-calendar";
import { WeekCalendar } from "./week-calendar";
import { YearCalendar } from "./year-calendar";

interface CalendarViewProps {
  initialData: CalendarPageData;
}

const viewOptions: { value: CalendarView; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

export function CalendarView({ initialData }: CalendarViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<CalendarView>(initialData.view);
  const [selectedDate, setSelectedDate] = useState<string>(initialData.selectedDate);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.selectedYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.selectedMonth);
  const [filterCommitmentId, setFilterCommitmentId] = useState<string | "all">(
    initialData.filterCommitmentId,
  );

  const [days, setDays] = useState<CalendarDayData[]>(initialData.days);
  const periodSummary = initialData.periodSummary;

  const { commitments, mycStartedAt, todayDate } = initialData;

  const startYear = mycStartedAt ? Number(mycStartedAt.slice(0, 4)) : selectedYear;
  const currentYear = Number(todayDate.slice(0, 4));

  // Realtime subscription for cross-device sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("calendar:daily_completions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_completions",
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Navigate URL on view/filter/date change so data reloads smoothly
  const navigateTo = (newView: CalendarView, newDate: string, newFilter: string | "all") => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("view", newView);
      params.set("date", newDate);
      if (newFilter !== "all") params.set("filter", newFilter);
      router.push(`/calendar?${params.toString()}`);
    });
  };

  const handleViewChange = (nextView: CalendarView) => {
    setView(nextView);
    navigateTo(nextView, selectedDate, filterCommitmentId);
  };

  const handleFilterChange = (nextFilter: string) => {
    const val = nextFilter === "all" ? "all" : nextFilter;
    setFilterCommitmentId(val);
    navigateTo(view, selectedDate, val);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const yr = Number(date.slice(0, 4));
    const mo = Number(date.slice(5, 7));
    setSelectedYear(yr);
    setSelectedMonth(mo);
    setView("day");
    navigateTo("day", date, filterCommitmentId);
  };

  // Period Navigation
  const handlePrev = () => {
    if (view === "year") {
      const nextYear = selectedYear - 1;
      if (nextYear >= startYear) {
        setSelectedYear(nextYear);
        const nextDate = `${nextYear}-01-01`;
        setSelectedDate(nextDate);
        navigateTo("year", nextDate, filterCommitmentId);
      }
    } else if (view === "month") {
      let nextMonth = selectedMonth - 1;
      let nextYear = selectedYear;
      if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }
      setSelectedYear(nextYear);
      setSelectedMonth(nextMonth);
      const nextDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      setSelectedDate(nextDate);
      navigateTo("month", nextDate, filterCommitmentId);
    } else if (view === "week") {
      const nextDate = addDays(selectedDate, -7);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
      navigateTo("week", nextDate, filterCommitmentId);
    } else {
      // view === "day"
      const nextDate = addDays(selectedDate, -1);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
      navigateTo("day", nextDate, filterCommitmentId);
    }
  };

  const handleNext = () => {
    if (view === "year") {
      const nextYear = selectedYear + 1;
      if (nextYear <= currentYear) {
        setSelectedYear(nextYear);
        const nextDate = `${nextYear}-01-01`;
        setSelectedDate(nextDate);
        navigateTo("year", nextDate, filterCommitmentId);
      }
    } else if (view === "month") {
      let nextMonth = selectedMonth + 1;
      let nextYear = selectedYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      setSelectedYear(nextYear);
      setSelectedMonth(nextMonth);
      const nextDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      setSelectedDate(nextDate);
      navigateTo("month", nextDate, filterCommitmentId);
    } else if (view === "week") {
      const nextDate = addDays(selectedDate, 7);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
      navigateTo("week", nextDate, filterCommitmentId);
    } else {
      // view === "day"
      const nextDate = addDays(selectedDate, 1);
      setSelectedDate(nextDate);
      setSelectedYear(Number(nextDate.slice(0, 4)));
      setSelectedMonth(Number(nextDate.slice(5, 7)));
      navigateTo("day", nextDate, filterCommitmentId);
    }
  };

  const handleJumpToToday = () => {
    setSelectedDate(todayDate);
    const yr = Number(todayDate.slice(0, 4));
    const mo = Number(todayDate.slice(5, 7));
    setSelectedYear(yr);
    setSelectedMonth(mo);
    navigateTo(view, todayDate, filterCommitmentId);
  };

  // Disabled states for prev/next
  const isPrevDisabled = () => {
    if (isPending || !mycStartedAt) return true;
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
    if (isPending || !mycStartedAt) return true;
    if (view === "year") return selectedYear >= currentYear;
    if (view === "month") {
      const currentMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const todayMonthKey = todayDate.slice(0, 7);
      return currentMonthKey >= todayMonthKey;
    }
    if (view === "week") {
      const weekRange = getWeekDateRange(selectedDate);
      return weekRange.endDate >= todayDate;
    }
    return selectedDate >= todayDate;
  };

  // Label for active period in nav bar
  const periodLabel = () => {
    if (view === "year") return String(selectedYear);
    if (view === "month") return formatMonthYear(selectedYear, selectedMonth);
    if (view === "week") {
      const w = getWeekDateRange(selectedDate);
      return `${w.startDate} – ${w.endDate}`;
    }
    return formatDisplayDate(selectedDate);
  };

  // Handle successful permanent completion submission from Day View
  const handleCompletionSuccess = (completion: DailyCompletion) => {
    setDays((prevDays) =>
      prevDays.map((d) => {
        if (d.date !== completion.date) return d;
        const newItems = d.items?.map((item) => {
          if (item.commitment.id !== completion.commitment_id) return item;
          return {
            ...item,
            isCompleted: true,
            completedAt: completion.completed_at,
            comment: completion.comment,
          };
        });
        const completed = newItems ? newItems.filter((i) => i.isCompleted).length : 0;
        const expected = d.expected;
        const percentage = expected > 0 ? Math.round((completed / expected) * 100) : null;
        const isConsistent = expected > 0 ? completed === expected : null;
        const intensity = getIntensityLevel(expected, completed, percentage);

        return {
          ...d,
          completed,
          percentage,
          isConsistent,
          intensity,
          items: newItems,
        };
      }),
    );
    router.refresh();
  };

  const selectedDayData =
    days.find((d) => d.date === selectedDate) ||
    initialData.days.find((d) => d.date === selectedDate);

  // If journey not started
  if (!mycStartedAt) {
    return (
      <>
        <PageHeader
          eyebrow="Calendar"
          title="Consistency Calendar"
          description="Every shaded day reflects showing up. Your calendar begins when you take your first pledge."
        />

        <Card className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CalendarIcon className="size-7" />
          </div>
          <div className="flex max-w-md flex-col gap-1.5">
            <CardTitle className="type-h2">Journey not started yet</CardTitle>
            <CardDescription className="text-base">
              The MYC calendar begins on the exact day you create your first commitment and confirm
              &quot;I COMMIT&quot;. Pre-journey history is never fabricated.
            </CardDescription>
          </div>
          <Link href="/commitments" className={buttonVariants({ size: "lg", className: "mt-2" })}>
            <SparklesIcon className="size-4" />
            Define your first commitment
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Your consistency, day by day"
        description="Every shaded day is a day you showed up. Darker means more got done."
      />

      {/* Control Bar: View Switcher, Filter, and Period Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Selector */}
          <SegmentedControl
            options={viewOptions}
            value={view}
            onValueChange={handleViewChange}
            aria-label="Calendar view mode"
          />

          {/* Commitment Filter */}
          <div className="relative inline-block">
            <label htmlFor="commitment-filter" className="sr-only">
              Filter by commitment
            </label>
            <select
              id="commitment-filter"
              value={filterCommitmentId}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="h-10 rounded-xl border border-input bg-card px-3.5 py-1.5 type-small font-medium text-foreground shadow-xs outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              <option value="all">All commitments</option>
              {commitments.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Navigation & Today */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={handlePrev}
            disabled={isPrevDisabled()}
            aria-label="Previous period"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-1.5 px-2">
            <span className="type-small font-bold text-foreground tabular-nums">
              {periodLabel()}
            </span>
            {isPending && (
              <Loader2Icon
                className="size-3.5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          <Button
            variant="secondary"
            size="icon-sm"
            onClick={handleNext}
            disabled={isNextDisabled()}
            aria-label="Next period"
          >
            <ChevronRightIcon className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleJumpToToday}
            disabled={isPending}
            className="ml-1 type-caption"
          >
            <RotateCcwIcon className="mr-1 size-3.5" />
            Today
          </Button>
        </div>
      </div>

      {/* Render Active View */}
      {view === "year" && (
        <YearCalendar
          year={selectedYear}
          days={days}
          selectedDate={selectedDate}
          mycStartedAt={mycStartedAt}
          periodSummary={periodSummary}
          onSelectDate={handleSelectDate}
        />
      )}

      {view === "month" && (
        <MonthCalendar
          year={selectedYear}
          month={selectedMonth}
          days={days}
          selectedDate={selectedDate}
          periodSummary={periodSummary}
          onSelectDate={handleSelectDate}
        />
      )}

      {view === "week" && (
        <WeekCalendar
          days={days}
          selectedDate={selectedDate}
          periodSummary={periodSummary}
          onSelectDate={handleSelectDate}
        />
      )}

      {view === "day" && (
        <DayCalendar
          dayData={selectedDayData}
          selectedDate={selectedDate}
          todayDate={todayDate}
          mycStartedAt={mycStartedAt}
          timezone={initialData.profile?.timezone || "UTC"}
          isLoading={isPending}
          onCompleteCommitment={handleCompletionSuccess}
        />
      )}
    </>
  );
}
