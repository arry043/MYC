import {
  CalendarCheck2Icon,
  FlameIcon,
  PlusIcon,
  SproutIcon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageSection } from "@/components/layout/page-header";
import { ColumnChart } from "@/components/progress/column-chart";
import { LinearProgress } from "@/components/progress/linear-progress";
import { MetricIndicator } from "@/components/progress/metric-indicator";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sampleCommitments,
  sampleJourney,
  sampleStats,
  sampleToday,
  sampleWeek,
} from "@/lib/sample-data";

import { TodayList } from "./_components/today-list";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const todays = sampleCommitments.filter((commitment) => commitment.status === "active");

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
              <PlusIcon />
              New commitment
            </Link>
          </>
        }
      />

      <div className="grid gap-stack lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <ProgressRing
              value={sampleToday.percent}
              label="Today's progress"
              size={148}
              strokeWidth={12}
            >
              <span className="type-metric">{sampleToday.percent}%</span>
              <span className="type-caption text-muted-foreground">today</span>
            </ProgressRing>
            <div className="grid w-full gap-4">
              <div className="grid gap-1 text-center sm:text-left">
                <p className="type-eyebrow text-muted-foreground">Today&apos;s progress</p>
                <p className="type-h2">
                  {sampleToday.done} of {sampleToday.total} commitments done
                </p>
                <p className="type-small text-muted-foreground">
                  One left. A few focused minutes is enough.
                </p>
              </div>
              <LinearProgress
                value={sampleToday.percent}
                label="Commitments completed today"
                size="sm"
              />
            </div>
          </div>
        </Card>

        <Card tone="lavender" className="justify-between lg:col-span-2">
          <CardHeader>
            <div className="grid gap-1">
              <p className="type-eyebrow text-lavender-foreground">Your MYC journey</p>
              <p className="type-display">Day {sampleJourney.day}</p>
            </div>
            <span
              aria-hidden
              className="grid size-11 place-content-center rounded-2xl bg-card/70 text-lavender-foreground"
            >
              <SproutIcon className="size-5" />
            </span>
          </CardHeader>
          <p className="type-small text-foreground/75">
            You committed on {sampleJourney.startedOn}. Miss once? Come back tomorrow.
          </p>
        </Card>
      </div>

      <Stagger className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Current streak"
            value={String(sampleStats.currentStreak)}
            unit="days"
            icon={FlameIcon}
            tone="peach"
            footer={<MetricIndicator trend="up">+3 this week</MetricIndicator>}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Best streak"
            value={String(sampleStats.bestStreak)}
            unit="days"
            icon={TrophyIcon}
            tone="sun"
            footer={<span className="type-caption text-muted-foreground">Personal best</span>}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Consistent days"
            value={String(sampleStats.consistentDays)}
            icon={CalendarCheck2Icon}
            tone="mint"
            footer={<MetricIndicator trend="up">+5 this month</MetricIndicator>}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Overall"
            value={`${sampleStats.overallConsistency}%`}
            icon={TargetIcon}
            tone="sky"
            footer={<MetricIndicator trend="flat">Same as last week</MetricIndicator>}
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
          <TodayList commitments={todays} />
        </PageSection>

        <PageSection title="This week" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="grid gap-0.5">
                <CardTitle>Daily consistency</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </div>
              <MetricIndicator trend="up">+6%</MetricIndicator>
            </CardHeader>
            <ColumnChart
              data={sampleWeek}
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
