"use client";

import { CalendarCheck2Icon, ClockIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { Commitment, CompletionHistoryEntry } from "@myc/types";
import { formatCompletionTimestamp, formatDisplayDate, getCompletionHistory } from "@myc/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface CommitmentHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  timezone?: string;
}

export function CommitmentHistoryDialog({
  isOpen,
  onClose,
  commitment,
  timezone = "UTC",
}: CommitmentHistoryDialogProps) {
  const [entries, setEntries] = useState<CompletionHistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [fetchedCommitmentId, setFetchedCommitmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !commitment) return;

    let isMounted = true;
    const supabase = createClient();
    getCompletionHistory(supabase, {
      commitmentId: commitment.id,
      limit: 50,
    }).then((res) => {
      if (!isMounted) return;
      if (res.error) {
        setError(res.error);
      } else {
        setEntries(res.entries);
        setTotalCount(res.totalCount);
        setError(null);
      }
      setFetchedCommitmentId(commitment.id);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, commitment]);

  const isLoading = isOpen && commitment ? fetchedCommitmentId !== commitment.id : false;

  if (!commitment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="type-h3">{commitment.title}</DialogTitle>
            <Badge tone="sky" className="tabular-nums">
              {totalCount} completed
            </Badge>
          </div>
          <DialogDescription>
            Historical record of completions and activity notes. Completions are immutable.
          </DialogDescription>
        </DialogHeader>

        {/* Content list */}
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-col gap-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-xl border border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-destructive">
              <p className="type-small font-medium">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <CalendarCheck2Icon className="size-6" />
              </div>
              <p className="type-body font-semibold text-foreground">No completions recorded yet</p>
              <p className="type-small text-muted-foreground">
                When you complete this commitment on scheduled days, your permanent history and
                notes will appear here.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {entries.map((entry) => {
                const formattedTime = formatCompletionTimestamp(entry.completedAt, timezone);

                return (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex flex-col">
                        <span className="type-small font-bold text-foreground">
                          {formatDisplayDate(entry.date)}
                        </span>
                        <span className="flex items-center gap-1.5 type-caption text-muted-foreground">
                          <ClockIcon className="size-3 shrink-0" aria-hidden="true" />
                          {formattedTime}
                        </span>
                      </div>
                      <Badge tone="success" className="text-[10px]">
                        Done
                      </Badge>
                    </div>

                    {/* Note / Comment */}
                    {entry.comment ? (
                      <div className="flex items-start gap-2.5 rounded-lg bg-secondary/50 p-3">
                        <MessageSquareIcon
                          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <blockquote className="type-small leading-relaxed text-foreground italic">
                          &ldquo;{entry.comment}&rdquo;
                        </blockquote>
                      </div>
                    ) : (
                      <p className="type-caption text-muted-foreground/75 italic">
                        No activity note added for this session.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
