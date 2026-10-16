"use client";

import { LockIcon } from "lucide-react";
import { useState } from "react";

import type { Commitment, DailyCompletion } from "@myc/types";
import { completeCommitment, formatDisplayDate } from "@myc/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface CompleteCommitmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  date: string;
  onSuccess: (completion: DailyCompletion) => void;
}

export function CompleteCommitmentDialog({
  isOpen,
  onClose,
  commitment,
  date,
  onSuccess,
}: CompleteCommitmentDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!commitment) return null;

  const formattedDate = formatDisplayDate(date);
  const maxCommentLength = 1000;
  const isOverLimit = comment.length > maxCommentLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isOverLimit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();
    const trimmed = comment.trim();

    const { data, error } = await completeCommitment(supabase, {
      commitmentId: commitment.id,
      date,
      comment: trimmed ? trimmed : null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
      toast({
        title: "Could not submit completion",
        description: error,
        tone: "error",
      });
      return;
    }

    if (data) {
      toast({
        title: "Commitment completed",
        description: `Permanently recorded for ${formattedDate}.`,
        tone: "success",
      });
      // Clear comment for next time
      setComment("");
      onSuccess(data);
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Complete commitment?</DialogTitle>
            <DialogDescription>
              Record your work for{" "}
              <span className="font-semibold text-foreground">{commitment.title}</span> on{" "}
              <span className="font-semibold text-foreground">{formattedDate}</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Activity note field */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="completion-comment" className="type-label">
                What did you accomplish?
              </Label>
              <span
                className={`type-caption tabular-nums ${
                  isOverLimit ? "font-semibold text-destructive" : "text-muted-foreground"
                }`}
              >
                {comment.length} / {maxCommentLength}
              </span>
            </div>

            <Textarea
              id="completion-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Solved LeetCode 289 and LeetCode 11"
              maxLength={maxCommentLength + 50}
              className="min-h-24 resize-y"
              aria-describedby="completion-comment-hint"
            />

            <p id="completion-comment-hint" className="type-caption text-muted-foreground">
              Add a note about what you did. This is optional.
            </p>
          </div>

          {/* Permanent-action calm notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="type-small leading-relaxed">
              Once submitted, this completion and its comment cannot be changed or undone.
            </p>
          </div>

          {/* Error notice if failure */}
          {errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-destructive">
              <p className="type-small font-medium">{errorMessage}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || isOverLimit}>
              Submit Completion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
