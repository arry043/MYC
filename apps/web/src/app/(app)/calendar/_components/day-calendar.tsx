"use client";

import { cn } from "cn";
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  HistoryIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";

import type { CalendarDayData, Commitment, DailyCompletion } from "@myc/types";
import { formatCompletionTimeOnly, formatDisplayDate } from "@myc/utils";

import { CommitmentHistoryDialog } from "@/components/commitments/commitment-history-dialog";
import { CompleteCommitmentDialog } from "@/components/commitments/complete-commitment-dialog";
import { LinearProgress } from "@/components/progress/linear-progress";
import { ProgressRing } from "@/components/progress/progress-ring";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DayCalendarProps {
  dayData: CalendarDayData | undefined;
  selectedDate: string;
  todayDate: string;
  mycStartedAt: string | null;
  timezone?: string;
  isLoading?: boolean;
  onCompleteCommitment: (completion: DailyCompletion) => void;
}

export function DayCalendar({
  dayData,
  selectedDate,
  todayDate,
  mycStartedAt,
  timezone = "UTC",
  isLoading = false,
  onCompleteCommitment,
}: DayCalendarProps) {
  const [completingCommitment, setCompletingCommitment] = useState<Commitment | null>(null);
  const [historyCommitment, setHistoryCommitment] = useState<Commitment | null>(null);

  const formattedDate = formatDisplayDate(selectedDate);
  const isFuture = selectedDate > todayDate;
  const isPreJourney = Boolean(mycStartedAt && selectedDate < mycStartedAt);
  const isToday = selectedDate === todayDate;

  const items = dayData?.items || [];
  const expected = dayData?.expected ?? items.length;
  const completed = dayData?.completed ?? items.filter((i) => i.isCompleted).length;
  const percentage = expected > 0 ? Math.round((completed / expected) * 100) : null;
  const isConsistent = expected > 0 ? completed === expected : null;

  const completedItems = items.filter((i) => i.isCompleted);

  return (
    <div className="flex flex-col gap-6">
      {/* Date Header Card */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="type-h2">{formattedDate}</h2>
          {isToday && <Badge tone="sky">Today</Badge>}
          {isConsistent && <Badge tone="success">Consistent Day</Badge>}
        </div>
        <p className="type-small text-muted-foreground">
          {isFuture
            ? "Upcoming date in your MYC schedule."
            : isPreJourney
              ? "Date preceded your official MYC journey start."
              : expected === 0
                ? "No commitments scheduled on this date."
                : `${completed} of ${expected} commitments completed (${percentage ?? 0}%).`}
        </p>
      </div>

      {/* Notice Banners */}
      {isFuture && (
        <Alert tone="warning">
          <AlertTitle>Future date</AlertTitle>
          <AlertDescription>
            Completions cannot be recorded in advance. This date will unlock when reached in your
            local timezone.
          </AlertDescription>
        </Alert>
      )}

      {isPreJourney && (
        <Alert tone="info">
          <AlertTitle>Pre-journey date</AlertTitle>
          <AlertDescription>
            Your MYC journey officially began on {mycStartedAt}. Dates prior to that are excluded
            from your streak and consistency scores.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid: Left is Commitments List & Activity, Right is Consistency Summary */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          {/* Commitments List */}
          <Card className="gap-4 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <CardTitle className="type-h3">Scheduled Commitments</CardTitle>
              <span className="type-caption text-muted-foreground">
                {completed} of {expected} complete
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <CircleIcon className="size-8 text-muted-foreground/30" />
                <p className="type-small font-medium text-foreground">No commitments scheduled</p>
                <p className="type-caption text-muted-foreground">
                  There are no active commitments scheduled for this day of the week.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((item) => {
                  const canComplete = !item.isCompleted && !isFuture && !isPreJourney;
                  const completedTime = item.completedAt
                    ? formatCompletionTimeOnly(item.completedAt, timezone)
                    : null;

                  return (
                    <li
                      key={item.commitment.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                        item.isCompleted
                          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {item.isCompleted ? (
                            <div
                              className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full text-emerald-600"
                              aria-label={`${item.commitment.title} completed`}
                            >
                              <CheckCircle2Icon className="size-5 fill-emerald-100 text-emerald-600" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCompletingCommitment(item.commitment)}
                              disabled={!canComplete}
                              aria-label={`Complete ${item.commitment.title}`}
                              className={cn(
                                "mt-0.5 grid size-6 shrink-0 place-content-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-primary active:scale-95",
                                canComplete
                                  ? "cursor-pointer text-muted-foreground hover:text-foreground"
                                  : "cursor-not-allowed text-muted-foreground/40",
                              )}
                            >
                              <CircleIcon className="size-5" />
                            </button>
                          )}

                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "type-small font-semibold text-foreground",
                                item.isCompleted && "text-muted-foreground line-through",
                              )}
                            >
                              {item.commitment.title}
                            </span>
                            {item.commitment.description && (
                              <span className="type-caption text-muted-foreground">
                                {item.commitment.description}
                              </span>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-[11px] text-muted-foreground/80">
                                {item.commitment.frequency === "daily"
                                  ? "Every day"
                                  : "Specific scheduled days"}
                              </span>
                              {completedTime && (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                  <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
                                  Completed at {completedTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.isCompleted ? (
                            <Badge tone="success" className="text-[10px]">
                              Done
                            </Badge>
                          ) : (
                            <Badge tone="outline" className="text-[10px]">
                              Pending
                            </Badge>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setHistoryCommitment(item.commitment)}
                            aria-label={`View history for ${item.commitment.title}`}
                            title="View commitment history"
                          >
                            <HistoryIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* Attached activity comment if present */}
                      {item.isCompleted && item.comment && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-secondary/40 p-2.5 text-xs text-foreground">
                          <MessageSquareIcon
                            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <blockquote className="leading-relaxed italic">
                            &ldquo;{item.comment}&rdquo;
                          </blockquote>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Day Activity Section */}
          <Card className="gap-4 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
                <CardTitle className="type-h3">Day Activity</CardTitle>
              </div>
              <span className="type-caption text-muted-foreground">
                {completedItems.length} recorded session{completedItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {completedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <p className="type-small font-medium text-foreground">No activity recorded yet</p>
                <p className="type-caption text-muted-foreground">
                  Completions submitted for {formattedDate} will be permanently listed here with
                  their submission times and notes.
                </p>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {completedItems.map((item) => {
                  const completedTime = item.completedAt
                    ? formatCompletionTimeOnly(item.completedAt, timezone)
                    : null;

                  return (
                    <li
                      key={`activity-${item.commitment.id}`}
                      className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="type-small font-bold text-foreground">
                          {item.commitment.title}
                        </span>
                        {completedTime && (
                          <span className="flex items-center gap-1.5 type-caption text-muted-foreground">
                            <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
                            {completedTime}
                          </span>
                        )}
                      </div>

                      {item.comment ? (
                        <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs text-foreground">
                          <MessageSquareIcon
                            className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <blockquote className="leading-relaxed italic">
                            &ldquo;{item.comment}&rdquo;
                          </blockquote>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/75 italic">
                          No note added for this completion.
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* Consistency Overview Card */}
        <Card className="flex flex-col items-center justify-center gap-5 self-start p-6 text-center">
          <ProgressRing
            value={percentage ?? 0}
            label={`Daily consistency: ${percentage ?? 0}%`}
            size={140}
            strokeWidth={12}
          >
            <span className="type-h2 font-bold tabular-nums">
              {percentage !== null ? `${percentage}%` : "—"}
            </span>
            <span className="type-caption text-muted-foreground">
              {percentage !== null ? "completed" : "unscheduled"}
            </span>
          </ProgressRing>

          <div className="flex flex-col gap-1">
            <CardTitle className="type-h3">Day Consistency</CardTitle>
            <CardDescription>
              {expected > 0
                ? `${completed} of ${expected} scheduled commitments kept.`
                : "No commitments required on this day."}
            </CardDescription>
          </div>

          {percentage !== null && (
            <div className="w-full pt-2">
              <LinearProgress value={percentage} label={`Progress for ${selectedDate}`} size="sm" />
            </div>
          )}
        </Card>
      </div>

      {/* Completion Confirmation Dialog */}
      <CompleteCommitmentDialog
        isOpen={Boolean(completingCommitment)}
        onClose={() => setCompletingCommitment(null)}
        commitment={completingCommitment}
        date={selectedDate}
        onSuccess={(completion) => {
          onCompleteCommitment(completion);
          setCompletingCommitment(null);
        }}
      />

      {/* History Dialog */}
      <CommitmentHistoryDialog
        isOpen={Boolean(historyCommitment)}
        onClose={() => setHistoryCommitment(null)}
        commitment={historyCommitment}
        timezone={timezone}
      />
    </div>
  );
}
