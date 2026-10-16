"use client";

import {
  CalendarCheck2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
  BarChart3Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AnalyticsPageData, AnalyticsReportingPeriod } from "@myc/types";
import { formatMonthYear } from "@myc/utils";

import { PageHeader, PageSection } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { AnalyticsChart } from "./analytics-chart";
import { CommitmentPerformanceList } from "./commitment-performance-list";

interface AnalyticsViewProps {
  initialData: AnalyticsPageData;
}

const periodOptions: { value: AnalyticsReportingPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

export function AnalyticsView({ initialData }: AnalyticsViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [period, setPeriod] = useState<AnalyticsReportingPeriod>(initialData.reportingPeriod);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData.monthlyChart.month);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.monthlyChart.year);

  const {
    metrics,
    periodSummary,
    weeklyChart,
    monthlyChart,
    commitmentPerformances,
    mycStartedAt,
    todayDate,
  } = initialData;

  const navigateParams = (
    nextPeriod: AnalyticsReportingPeriod,
    nextYear: number,
    nextMonth: number,
  ) => {
    startTransition(() => {
      const p = new URLSearchParams();
      p.set("period", nextPeriod);
      p.set("year", String(nextYear));
      p.set("month", String(nextMonth));
      router.push(`/analytics?${p.toString()}`);
    });
  };

  const handlePeriodChange = (nextPeriod: AnalyticsReportingPeriod) => {
    setPeriod(nextPeriod);
    navigateParams(nextPeriod, selectedYear, selectedMonth);
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
    navigateParams(period, nextY, nextM);
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
    navigateParams(period, nextY, nextM);
  };

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

  // Journey not started state
  if (!mycStartedAt) {
    return (
      <>
        <PageHeader
          eyebrow="Analytics"
          title="Consistency Analytics"
          description="Patterns over time, not judgement. Your analytics unlock once your journey officially begins."
        />

        <Card className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BarChart3Icon className="size-7" />
          </div>
          <div className="flex max-w-md flex-col gap-1.5">
            <CardTitle className="type-h2">Journey not started yet</CardTitle>
            <CardDescription className="text-base">
              Real metrics, streaks, and trend charts require an active MYC journey. Pre-journey
              data is never fabricated.
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
        eyebrow="Analytics"
        title="How consistent you've been"
        description="Patterns over time, not judgement. Look for the trend, not the single day."
      />

      {/* Lifetime Metric Cards */}
      <Stagger className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Current streak"
            value={String(metrics.currentStreak)}
            unit="days"
            icon={FlameIcon}
            tone="peach"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Best streak"
            value={String(metrics.bestStreak)}
            unit="days"
            icon={TrophyIcon}
            tone="sun"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Consistent days"
            value={String(metrics.consistentDays)}
            unit="days"
            icon={CalendarCheck2Icon}
            tone="mint"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Overall consistency"
            value={metrics.overallPercentage !== null ? `${metrics.overallPercentage}%` : "N/A"}
            icon={TargetIcon}
            tone="sky"
          />
        </StaggerItem>
      </Stagger>

      {/* Reporting Period Switcher */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="type-h3">Reporting Period</h2>
          <p className="type-caption text-muted-foreground">
            Analyzing {periodLabelText} ({periodSummary.startDate} – {periodSummary.endDate})
          </p>
        </div>
        <SegmentedControl
          options={periodOptions}
          value={period}
          onValueChange={handlePeriodChange}
          aria-label="Select analytics reporting period"
        />
      </div>

      {/* Period Highlights & Overall Progress Ring */}
      <div className="grid gap-stack lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Weekly Chart */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="type-h3">Weekly consistency</CardTitle>
              <CardDescription>{weeklyChart.label}</CardDescription>
            </div>
          </CardHeader>
          <AnalyticsChart points={weeklyChart.points} label={weeklyChart.label} />
        </Card>

        {/* Progress Ring Card */}
        <Card className="flex flex-col items-center justify-center gap-5 p-6 text-center">
          <ProgressRing
            value={periodSummary.completionPercentage ?? 0}
            label={`${periodLabelText} consistency`}
            size={160}
            strokeWidth={14}
          >
            <span className="type-h2 font-bold tabular-nums">
              {periodSummary.completionPercentage !== null
                ? `${periodSummary.completionPercentage}%`
                : "—"}
            </span>
            <span className="type-caption text-muted-foreground">{periodLabelText}</span>
          </ProgressRing>
          <div className="grid gap-1">
            <CardTitle className="type-h3">Period Performance</CardTitle>
            <CardDescription>
              {periodSummary.totalCompletedInstances} of {periodSummary.totalEligibleInstances} kept
              · {periodSummary.consistentDays} consistent days
            </CardDescription>
          </div>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="p-6">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="type-h3">Monthly consistency</CardTitle>
            <CardDescription>
              Daily consistency percentages across {formatMonthYear(selectedYear, selectedMonth)}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={handlePrevMonth}
              disabled={isPrevMonthDisabled}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="px-1 type-caption font-bold tabular-nums">
              {formatMonthYear(selectedYear, selectedMonth)}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        <AnalyticsChart
          points={monthlyChart.points}
          label={`Monthly consistency for ${formatMonthYear(selectedYear, selectedMonth)}`}
          className="mt-4"
        />
      </Card>

      {/* Commitment Performance Breakdown */}
      <PageSection title="Performance by commitment">
        <CommitmentPerformanceList
          performances={commitmentPerformances}
          periodLabel={periodLabelText}
        />
      </PageSection>
    </>
  );
}
