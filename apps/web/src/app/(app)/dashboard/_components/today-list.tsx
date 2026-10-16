"use client";

import { cn } from "cn";
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  HistoryIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Commitment, DailyCommitmentItem, DailyCompletion } from "@myc/types";
import { formatCompletionTimeOnly, formatFrequency } from "@myc/utils";

import { CommitmentHistoryDialog } from "@/components/commitments/commitment-history-dialog";
import { CompleteCommitmentDialog } from "@/components/commitments/complete-commitment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DOT_TONE: Record<string, string> = {
  sky: "bg-sky",
  lavender: "bg-lavender-foreground",
  peach: "bg-peach-foreground",
  mint: "bg-mint-foreground",
  sun: "bg-sun-foreground",
};

interface TodayListProps {
  items: DailyCommitmentItem[];
  hasAnyCommitments: boolean;
  timezone?: string;
  todayDate: string;
  onCompleteSuccess: (completion: DailyCompletion) => void;
}

export function TodayList({
  items,
  hasAnyCommitments,
  timezone = "UTC",
  todayDate,
  onCompleteSuccess,
}: TodayListProps) {
  const [activeCommitmentForComplete, setActiveCommitmentForComplete] = useState<Commitment | null>(
    null,
  );
  const [activeCommitmentForHistory, setActiveCommitmentForHistory] = useState<Commitment | null>(
    null,
  );

  if (!hasAnyCommitments) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="type-h3">No commitments created yet</p>
        <p className="max-w-md type-small text-muted-foreground">
          Start your consistency journey with one small, meaningful action you can maintain every
          day.
        </p>
        <Link href="/commitments" className={buttonVariants({ size: "sm", className: "mt-2" })}>
          <PlusIcon className="size-4" />
          Create your first commitment
        </Link>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="type-h3">Nothing scheduled for today</p>
        <p className="type-small text-muted-foreground">
          You have no active commitments scheduled for today. Take a breath or review your schedule.
        </p>
        <Link
          href="/commitments"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-1" })}
        >
          View all commitments
        </Link>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 py-2">
        <ul className="divide-y divide-border/70">
          {items.map((item) => {
            const { commitment, isCompleted, completedAt, comment } = item;
            const tone = commitment.tone || "sky";
            const completedTime = completedAt
              ? formatCompletionTimeOnly(completedAt, timezone)
              : null;

            return (
              <li
                key={commitment.id}
                className={cn(
                  "flex flex-col gap-2.5 px-4 py-3.5 transition-colors sm:px-6",
                  isCompleted && "bg-accent/10",
                )}
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {isCompleted ? (
                      <div
                        className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full text-emerald-600"
                        aria-label={`"${commitment.title}" completed permanently`}
                      >
                        <CheckCircle2Icon className="size-5 fill-emerald-100 text-emerald-600" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveCommitmentForComplete(commitment)}
                        aria-label={`Complete "${commitment.title}" for today`}
                        className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border border-input bg-card text-muted-foreground transition-all duration-150 outline-none hover:border-foreground/50 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
                      >
                        <CircleIcon className="size-4" />
                      </button>
                    )}

                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <p
                        className={cn(
                          "truncate type-label text-foreground transition-all duration-150",
                          isCompleted && "text-muted-foreground line-through decoration-border",
                        )}
                      >
                        {commitment.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 type-caption text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={cn("size-1.5 rounded-full", DOT_TONE[tone] || "bg-sky")}
                          />
                          {formatFrequency(commitment.frequency, commitment.schedule_days)}
                        </span>
                        {completedTime && (
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
                            {completedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <Badge tone="success" className="text-[10px]">
                        Done
                      </Badge>
                    ) : (
                      <Badge tone="outline" className="text-[10px]">
                        Not yet
                      </Badge>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setActiveCommitmentForHistory(commitment)}
                      aria-label={`View history for ${commitment.title}`}
                      title="View commitment history"
                    >
                      <HistoryIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Attached activity comment if completed */}
                {isCompleted && comment && (
                  <div className="ml-9 flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/50 p-2.5 text-xs text-foreground">
                    <MessageSquareIcon
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <blockquote className="leading-relaxed italic">
                      &ldquo;{comment}&rdquo;
                    </blockquote>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Confirmation Dialog */}
      <CompleteCommitmentDialog
        isOpen={Boolean(activeCommitmentForComplete)}
        onClose={() => setActiveCommitmentForComplete(null)}
        commitment={activeCommitmentForComplete}
        date={todayDate}
        onSuccess={(completion) => {
          onCompleteSuccess(completion);
          setActiveCommitmentForComplete(null);
        }}
      />

      {/* History Dialog */}
      <CommitmentHistoryDialog
        isOpen={Boolean(activeCommitmentForHistory)}
        onClose={() => setActiveCommitmentForHistory(null)}
        commitment={activeCommitmentForHistory}
        timezone={timezone}
      />
    </>
  );
}
