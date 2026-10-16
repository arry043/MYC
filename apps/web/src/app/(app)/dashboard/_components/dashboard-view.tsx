"use client";

import {
  CalendarCheck2Icon,
  FlameIcon,
  PlusIcon,
  SproutIcon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type {
  Commitment,
  ConsistencyMetrics,
  DailyCommitmentItem,
  DailyCompletion,
  Profile,
} from "@myc/types";
import {
  calculateConsistencyMetrics,
  completeCommitment,
  getDateRange,
  uncompleteCommitment,
} from "@myc/utils";

import { PageHeader, PageSection } from "@/components/layout/page-header";
import { ColumnChart } from "@/components/progress/column-chart";
import { LinearProgress } from "@/components/progress/linear-progress";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

import { TodayList } from "./today-list";

interface DashboardViewProps {
  initialMetrics: ConsistencyMetrics;
  initialTodayItems: DailyCommitmentItem[];
  allCommitments: Commitment[];
  allCompletions: DailyCompletion[];
  initialProfile: Profile | null;
  todayDate: string;
}

export function DashboardView({
  initialMetrics,
  initialTodayItems,
  allCommitments,
  allCompletions,
  initialProfile,
  todayDate,
}: DashboardViewProps) {
  const [metrics, setMetrics] = useState<ConsistencyMetrics>(initialMetrics);
  const [todayItems, setTodayItems] = useState<DailyCommitmentItem[]>(initialTodayItems);
  const [completions, setCompletions] = useState<DailyCompletion[]>(allCompletions);

  // Compute journey day number
  let journeyDay = 1;
  if (initialProfile?.myc_started_at) {
    const days = getDateRange(initialProfile.myc_started_at, todayDate);
    journeyDay = Math.max(1, days.length);
  }

  // Handle completion toggle
  const handleToggle = async (commitmentId: string) => {
    const currentItem = todayItems.find((i) => i.commitment.id === commitmentId);
    if (!currentItem) return;

    const willBeCompleted = !currentItem.isCompleted;
    const supabase = createClient();

    // Optimistic update
    const previousTodayItems = [...todayItems];
    const previousCompletions = [...completions];
    const previousMetrics = { ...metrics };

    let updatedCompletions: DailyCompletion[];
    if (willBeCompleted) {
      const mockComp: DailyCompletion = {
        id: `opt-${Date.now()}`,
        user_id: currentItem.commitment.user_id,
        commitment_id: commitmentId,
        date: todayDate,
        status: "completed",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      updatedCompletions = [...completions, mockComp];
    } else {
      updatedCompletions = completions.filter(
        (c) => !(c.commitment_id === commitmentId && c.date === todayDate),
      );
    }

    setCompletions(updatedCompletions);
    setTodayItems((prev) =>
      prev.map((item) =>
        item.commitment.id === commitmentId
          ? {
              ...item,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString() : null,
            }
          : item,
      ),
    );

    // Recompute metrics locally
    const nextMetrics = calculateConsistencyMetrics({
      commitments: allCommitments,
      completions: updatedCompletions,
      timezone: initialProfile?.timezone || "UTC",
      mycStartedAt: initialProfile?.myc_started_at || null,
      targetDate: todayDate,
    });
    setMetrics(nextMetrics);

    // Execute server RPC
    if (willBeCompleted) {
      const { data, error } = await completeCommitment(supabase, commitmentId, todayDate);
      if (error) {
        // Rollback
        setTodayItems(previousTodayItems);
        setCompletions(previousCompletions);
        setMetrics(previousMetrics);
        toast({
          title: "Could not complete commitment",
          description: error,
          tone: "error",
        });
        return;
      }
      if (data) {
        setCompletions((prev) =>
          prev.map((c) => (c.commitment_id === commitmentId && c.date === todayDate ? data : c)),
        );
      }
    } else {
      const { error } = await uncompleteCommitment(supabase, commitmentId, todayDate);
      if (error) {
        // Rollback
        setTodayItems(previousTodayItems);
        setCompletions(previousCompletions);
        setMetrics(previousMetrics);
        toast({
          title: "Could not uncomplete commitment",
          description: error,
          tone: "error",
        });
        return;
      }
    }
  };

  // Build last 7 days chart data
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const weekChartData = last7Dates.map((dateStr, idx) => {
    const dayOfWeek = weekDays[new Date(dateStr).getDay()] || "Day";
    // Check if within journey
    if (!initialProfile?.myc_started_at || dateStr < initialProfile.myc_started_at) {
      return { label: dayOfWeek, value: 0, highlight: idx === 6 };
    }
    const compsOnDate = completions.filter((c) => c.date === dateStr);
    const activeOnDate = allCommitments.filter((c) => c.status === "active");
    const expected = activeOnDate.filter(
      (c) =>
        dateStr >= c.start_date &&
        (!c.end_date || dateStr <= c.end_date) &&
        (c.frequency === "daily" ||
          (c.schedule_days &&
            c.schedule_days.includes(
              (new Date(dateStr).getDay() === 0 ? 7 : new Date(dateStr).getDay()) as
                1 | 2 | 3 | 4 | 5 | 6 | 7,
            ))),
    );

    if (expected.length === 0) {
      return { label: dayOfWeek, value: 0, highlight: idx === 6 };
    }

    const completed = expected.filter((c) =>
      compsOnDate.some((comp) => comp.commitment_id === c.id),
    ).length;
    const pct = Math.round((completed / expected.length) * 100);
    return { label: dayOfWeek, value: pct, highlight: idx === 6 };
  });

  const todaySummary = metrics.today;
  const todayPercent = todaySummary.percentage ?? 0;
  const hasStartedJourney = Boolean(initialProfile?.myc_started_at);

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Welcome back"
        description="Small actions, repeated. Here's where today stands."
        actions={
          <>
            <Link
              href="/calendar"
              className={buttonVariants({ variant: "secondary", className: "max-sm:flex-1" })}
            >
              View calendar
            </Link>
            <Link href="/commitments" className={buttonVariants({ className: "max-sm:flex-1" })}>
              <PlusIcon className="size-4" />
              New commitment
            </Link>
          </>
        }
      />

      <div className="grid gap-stack lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <ProgressRing value={todayPercent} label="Today's progress" size={148} strokeWidth={12}>
              <span className="type-metric">{todayPercent}%</span>
              <span className="type-caption text-muted-foreground">today</span>
            </ProgressRing>
            <div className="grid w-full gap-4">
              <div className="grid gap-1 text-center sm:text-left">
                <p className="type-eyebrow text-muted-foreground">Today&apos;s progress</p>
                <p className="type-h2">
                  {todaySummary.expected > 0
                    ? `${todaySummary.completed} of ${todaySummary.expected} commitments done`
                    : "No commitments scheduled today"}
                </p>
                <p className="type-small text-muted-foreground">
                  {todaySummary.expected === 0
                    ? "Enjoy your open schedule or plan ahead."
                    : todaySummary.completed === todaySummary.expected
                      ? "All done for today. Consistency at its best!"
                      : todaySummary.completed === 0
                        ? "Ready when you are. Showing up is what counts."
                        : `${todaySummary.expected - todaySummary.completed} left. A few focused minutes is enough.`}
                </p>
              </div>
              <LinearProgress value={todayPercent} label="Commitments completed today" size="sm" />
            </div>
          </div>
        </Card>

        <Card tone="lavender" className="justify-between lg:col-span-2">
          <CardHeader>
            <div className="grid gap-1">
              <p className="type-eyebrow text-lavender-foreground">Your MYC journey</p>
              <p className="type-display">
                {hasStartedJourney ? `Day ${journeyDay}` : "Not started"}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-11 place-content-center rounded-2xl bg-card/70 text-lavender-foreground"
            >
              <SproutIcon className="size-5" />
            </span>
          </CardHeader>
          <p className="type-small text-foreground/75">
            {hasStartedJourney
              ? `You committed on ${initialProfile?.myc_started_at}. Miss once? Come back tomorrow.`
              : 'Begin by defining your first commitment and confirming "I COMMIT".'}
          </p>
        </Card>
      </div>

      <Stagger className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Current streak"
            value={hasStartedJourney ? String(metrics.currentStreak) : "—"}
            unit={hasStartedJourney ? "days" : undefined}
            icon={FlameIcon}
            tone="peach"
            footer={
              <span className="type-caption text-muted-foreground">
                {metrics.currentStreak > 0 ? "Keep it going today" : "Showing up counts"}
              </span>
            }
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Best streak"
            value={hasStartedJourney ? String(metrics.bestStreak) : "—"}
            unit={hasStartedJourney ? "days" : undefined}
            icon={TrophyIcon}
            tone="sun"
            footer={<span className="type-caption text-muted-foreground">Personal best</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Consistent days"
            value={hasStartedJourney ? String(metrics.consistentDays) : "—"}
            icon={CalendarCheck2Icon}
            tone="mint"
            footer={<span className="type-caption text-muted-foreground">100% completed days</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Overall"
            value={
              hasStartedJourney && metrics.overallPercentage !== null
                ? `${metrics.overallPercentage}%`
                : "—"
            }
            icon={TargetIcon}
            tone="sky"
            footer={
              <span className="type-caption text-muted-foreground">
                {metrics.overallPercentage !== null
                  ? `${metrics.totalCompletedCommitmentDays} / ${metrics.totalExpectedCommitmentDays} done`
                  : "Start to track"}
              </span>
            }
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-stack lg:grid-cols-5">
        <PageSection
          title="Today's commitments"
          className="lg:col-span-3"
          action={
            <Link href="/commitments" className={buttonVariants({ variant: "link", size: "sm" })}>
              See all
            </Link>
          }
        >
          <TodayList
            items={todayItems}
            hasAnyCommitments={allCommitments.length > 0}
            onToggle={handleToggle}
          />
        </PageSection>

        <PageSection title="This week" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="grid gap-0.5">
                <CardTitle>Daily consistency</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </div>
            </CardHeader>
            <ColumnChart
              data={weekChartData}
              label="Daily consistency, last 7 days"
              highlightLast
              className="mt-2"
            />
          </Card>
        </PageSection>
      </div>
    </>
  );
}
