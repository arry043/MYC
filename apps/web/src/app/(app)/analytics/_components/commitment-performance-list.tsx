"use client";

import { cn } from "cn";

import type { CommitmentPerformance } from "@myc/types";
import { formatFrequency } from "@myc/utils";

import { LinearProgress } from "@/components/progress/linear-progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const toneColors: Record<string, string> = {
  sky: "bg-sky-400",
  lavender: "bg-purple-400",
  peach: "bg-orange-300",
  mint: "bg-emerald-400",
  sun: "bg-amber-400",
};

interface CommitmentPerformanceListProps {
  performances: CommitmentPerformance[];
  periodLabel: string;
}

export function CommitmentPerformanceList({
  performances,
  periodLabel,
}: CommitmentPerformanceListProps) {
  if (performances.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="type-small text-muted-foreground">No commitments found for this account.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {performances.map(({ commitment, expectedInstances, completedInstances, percentage }) => {
        const toneBg = toneColors[commitment.tone || "sky"] ?? "bg-sky-400";
        const hasExpected = expectedInstances > 0;

        return (
          <Card key={commitment.id} className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <span className={cn("size-3 shrink-0 rounded-full", toneBg)} aria-hidden="true" />
                  <div>
                    <h3 className="type-h3 leading-tight">{commitment.title}</h3>
                    <p className="type-caption text-muted-foreground">
                      {formatFrequency(
                        commitment.frequency,
                        commitment.schedule_days,
                        commitment.scheduled_date,
                      )}{" "}
                      · {periodLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="type-caption font-semibold text-foreground tabular-nums">
                    {completedInstances} / {expectedInstances} kept
                  </span>
                  <Badge tone={hasExpected ? "sky" : "neutral"} className="tabular-nums">
                    {percentage !== null ? `${percentage}%` : "N/A"}
                  </Badge>
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <LinearProgress
                  value={percentage ?? 0}
                  label={`${commitment.title} completion`}
                  size="sm"
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
