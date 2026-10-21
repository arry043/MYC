"use client";

import { FlameIcon, PlusIcon, SproutIcon, TargetIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  Commitment,
  ConsistencyMetrics,
  DailyCommitmentItem,
  DailyCompletion,
  Profile,
} from "@myc/types";
import { calculateConsistencyMetrics, getDateRange, isCommitmentExpectedOnDate } from "@myc/utils";

import { PageHeader, PageSection } from "@/components/layout/page-header";
import { ColumnChart } from "@/components/progress/column-chart";
import { LinearProgress } from "@/components/progress/linear-progress";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const router = useRouter();
  const [metrics, setMetrics] = useState<ConsistencyMetrics>(initialMetrics);
  const [todayItems, setTodayItems] = useState<DailyCommitmentItem[]>(initialTodayItems);
  const [completions, setCompletions] = useState<DailyCompletion[]>(allCompletions);

  // Realtime subscription for cross-device sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard:daily_completions")
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

  // Compute journey day number
  let journeyDay = 1;
  if (initialProfile?.myc_started_at) {
    const days = getDateRange(initialProfile.myc_started_at, todayDate);
    journeyDay = Math.max(1, days.length);
  }

  // Handle permanent completion submission from TodayList dialog
  const handleCompletionSuccess = (completion: DailyCompletion) => {
    const updatedCompletions = [...completions, completion];
    setCompletions(updatedCompletions);

    setTodayItems((prev) =>
      prev.map((item) =>
        item.commitment.id === completion.commitment_id
          ? {
              ...item,
              isCompleted: true,
              completedAt: completion.completed_at,
              comment: completion.comment,
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

    // Refresh server data
    router.refresh();
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
    const expected = activeOnDate.filter((c) =>
      isCommitmentExpectedOnDate(c, dateStr, initialProfile.myc_started_at),
    );

    if (expected.length === 0) {
      return { label: dayOfWeek, value: 0, highlight: idx === 6 };
    }

    const pct = Math.round((compsOnDate.length / expected.length) * 100);
    return {
      label: dayOfWeek,
      value: Math.min(100, pct),
      highlight: idx === 6,
    };
  });

  const hasStartedJourney = Boolean(initialProfile?.myc_started_at);
  const todayPercentage = metrics.today.percentage ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Show up today."
        description="One day at a time. Consistency compounds into identity."
        actions={
          <Link
            href="/commitments"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <PlusIcon />
            Manage commitments
          </Link>
        }
      />

      {/* Hero Stats */}
      <Stagger className="grid grid-cols-2 gap-stack lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Current streak"
            value={String(hasStartedJourney ? metrics.currentStreak : 0)}
            unit="days"
            tone="sun"
            icon={FlameIcon}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Best streak"
            value={String(hasStartedJourney ? metrics.bestStreak : 0)}
            unit="days"
            tone="lavender"
            icon={TrophyIcon}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Overall consistency"
            value={
              hasStartedJourney && metrics.overallPercentage !== null
                ? `${metrics.overallPercentage}%`
                : "—"
            }
            tone="sky"
            icon={TargetIcon}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            label="Journey day"
            value={hasStartedJourney ? String(journeyDay) : "—"}
            tone="mint"
            icon={SproutIcon}
          />
        </StaggerItem>
      </Stagger>

      {/* Today's Focus Card */}
      <Stagger className="grid gap-stack lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <Card className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-2">
              <span className="type-caption font-bold tracking-wider text-muted-foreground uppercase">
                Today&apos;s Focus
              </span>
              <CardTitle className="type-h2">
                {metrics.today.expected === 0
                  ? "No commitments scheduled today"
                  : metrics.today.completed === metrics.today.expected
                    ? "All commitments complete for today! 🎉"
                    : `${metrics.today.completed} of ${metrics.today.expected} completed`}
              </CardTitle>
              <CardDescription className="text-base">
                {metrics.today.expected === 0
                  ? "Enjoy your rest day, or define a new commitment for today."
                  : metrics.today.completed === metrics.today.expected
                    ? "Outstanding consistency. Your streak for today is fully secured."
                    : "Show up for yourself today. Every completed commitment counts."}
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-between type-caption font-medium text-muted-foreground">
                <span>Progress today</span>
                <span>{todayPercentage}%</span>
              </div>
              <LinearProgress value={todayPercentage} label="Today's progress" />
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="flex flex-col items-center justify-center gap-4 p-6 text-center sm:p-8">
            <ProgressRing
              value={todayPercentage}
              label="Today's consistency percentage ring"
              size={140}
              strokeWidth={12}
            >
              <span className="type-h2 font-bold tabular-nums">
                {metrics.today.expected > 0 ? `${todayPercentage}%` : "—"}
              </span>
              <span className="type-caption text-muted-foreground">today</span>
            </ProgressRing>

            <div className="flex flex-col gap-1">
              <p className="type-small font-semibold text-foreground">
                {metrics.today.expected > 0
                  ? `${metrics.today.completed} / ${metrics.today.expected} tasks`
                  : "Unscheduled"}
              </p>
              <p className="type-caption text-muted-foreground">
                {metrics.today.isConsistent
                  ? "Today is a Consistent Day!"
                  : metrics.today.expected > 0
                    ? `${metrics.today.expected - metrics.today.completed} remaining`
                    : "Take a break"}
              </p>
            </div>
          </Card>
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
            timezone={initialProfile?.timezone || "UTC"}
            todayDate={todayDate}
            onCompleteSuccess={handleCompletionSuccess}
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
