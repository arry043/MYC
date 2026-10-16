import { CalendarCheck2Icon, FlameIcon, TargetIcon, TrophyIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader, PageSection } from "@/components/layout/page-header";
import { ColumnChart } from "@/components/progress/column-chart";
import { LinearProgress } from "@/components/progress/linear-progress";
import { MetricIndicator } from "@/components/progress/metric-indicator";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleCommitments, sampleStats, sampleWeeks } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="How consistent you've been"
        description="Patterns over time, not judgement. Look for the trend, not the single day."
      />

      <Stagger className="grid grid-cols-2 gap-stack xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Current streak"
            value={String(sampleStats.currentStreak)}
            unit="days"
            icon={FlameIcon}
            tone="peach"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Best streak"
            value={String(sampleStats.bestStreak)}
            unit="days"
            icon={TrophyIcon}
            tone="sun"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Consistent days"
            value={String(sampleStats.consistentDays)}
            icon={CalendarCheck2Icon}
            tone="mint"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Overall"
            value={`${sampleStats.overallConsistency}%`}
            icon={TargetIcon}
            tone="sky"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-stack lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="grid gap-0.5">
              <CardTitle>Weekly consistency</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </div>
            <MetricIndicator trend="up">+20% since W1</MetricIndicator>
          </CardHeader>
          <ColumnChart
            data={sampleWeeks}
            label="Weekly consistency, last 8 weeks"
            highlightLast
            className="mt-4"
          />
        </Card>

        <Card className="items-center justify-center gap-5 text-center">
          <ProgressRing
            value={sampleStats.overallConsistency}
            label="Overall consistency"
            size={164}
            strokeWidth={14}
          >
            <span className="type-metric">{sampleStats.overallConsistency}%</span>
            <span className="type-caption text-muted-foreground">overall</span>
          </ProgressRing>
          <div className="grid gap-1">
            <CardTitle>Overall consistency</CardTitle>
            <CardDescription>Since you started MYC</CardDescription>
          </div>
        </Card>
      </div>

      <PageSection title="By commitment">
        <Card className="gap-6">
          {sampleCommitments.map((commitment) => (
            <LinearProgress
              key={commitment.id}
              value={commitment.consistency}
              label={commitment.title}
              showLabel
            />
          ))}
        </Card>
      </PageSection>
    </>
  );
}
