"use client";

import { cn } from "cn";
import { CheckIcon, CircleIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DailyCommitmentItem } from "@myc/types";
import { formatFrequency } from "@myc/utils";

import { buttonVariants } from "@/components/ui/button";
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
  onToggle: (commitmentId: string) => Promise<void>;
}

export function TodayList({ items, hasAnyCommitments, onToggle }: TodayListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    if (pendingId) return;
    setPendingId(id);
    try {
      await onToggle(id);
    } finally {
      setPendingId(null);
    }
  };

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
    <Card className="gap-0 py-2">
      <ul className="divide-y divide-border/70">
        {items.map(({ commitment, isCompleted }) => {
          const isPending = pendingId === commitment.id;
          const tone = commitment.tone || "sky";

          return (
            <li
              key={commitment.id}
              className="flex items-center justify-between gap-3.5 px-4 py-3 sm:px-6"
            >
              <button
                type="button"
                onClick={() => handleToggle(commitment.id)}
                disabled={isPending}
                aria-label={`Mark "${commitment.title}" as ${isCompleted ? "incomplete" : "complete"}`}
                aria-pressed={isCompleted}
                className={cn(
                  "relative grid size-6 shrink-0 place-content-center rounded-full border transition-all duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-input bg-card text-transparent hover:border-foreground/50",
                  isPending && "opacity-60",
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="size-3.5 stroke-[2.5]" />
                ) : (
                  <CircleIcon className="size-3 text-transparent" />
                )}
              </button>

              <div className="grid min-w-0 flex-1 gap-0.5">
                <p
                  className={cn(
                    "truncate type-label text-foreground transition-all duration-150",
                    isCompleted && "text-muted-foreground line-through decoration-border",
                  )}
                >
                  {commitment.title}
                </p>
                <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", DOT_TONE[tone] || "bg-sky")}
                  />
                  {formatFrequency(commitment.frequency, commitment.schedule_days)}
                </p>
              </div>

              <span
                className={cn(
                  "type-caption font-semibold",
                  isCompleted ? "text-success" : "text-muted-foreground",
                )}
              >
                {isCompleted ? "Done" : "Not yet"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
