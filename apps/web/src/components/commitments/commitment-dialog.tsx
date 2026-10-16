"use client";

import { cn } from "cn";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

import type { Commitment, CommitmentFrequency, CommitmentTone, Weekday } from "@myc/types";
import { getUserLocalDateString, VALID_TONES, validateCommitmentInput, WEEKDAYS } from "@myc/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const TONE_CLASSES: Record<CommitmentTone, { bg: string; border: string; text: string }> = {
  sky: {
    bg: "bg-primary-soft",
    border: "border-primary/40",
    text: "text-primary-soft-foreground",
  },
  lavender: {
    bg: "bg-lavender",
    border: "border-lavender/60",
    text: "text-lavender-foreground",
  },
  peach: {
    bg: "bg-peach",
    border: "border-peach/60",
    text: "text-peach-foreground",
  },
  mint: {
    bg: "bg-mint",
    border: "border-mint/60",
    text: "text-mint-foreground",
  },
  sun: {
    bg: "bg-sun",
    border: "border-sun/60",
    text: "text-sun-foreground",
  },
};

interface CommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment?: Commitment | null;
  isFirstCommitment?: boolean;
  userTimezone?: string;
  onSuccess: (commitment: Commitment) => void;
}

export function CommitmentDialog({
  open,
  onOpenChange,
  commitment,
  isFirstCommitment = false,
  userTimezone,
  onSuccess,
}: CommitmentDialogProps) {
  const isEditing = Boolean(commitment && commitment.status !== "draft");

  const [step, setStep] = useState<"form" | "review">("form");
  const [draftId, setDraftId] = useState<string | null>(commitment?.id ?? null);

  // Form states
  const [title, setTitle] = useState(commitment?.title ?? "");
  const [description, setDescription] = useState(commitment?.description ?? "");
  const [frequency, setFrequency] = useState<CommitmentFrequency>(
    (commitment?.frequency as CommitmentFrequency) || "daily",
  );
  const [scheduleDays, setScheduleDays] = useState<Weekday[]>(
    (commitment?.schedule_days as Weekday[]) || [1, 2, 3, 4, 5, 6, 7],
  );
  const [tone, setTone] = useState<CommitmentTone>((commitment?.tone as CommitmentTone) || "sky");
  const startDate = commitment?.start_date || getUserLocalDateString(userTimezone);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayId: Weekday) => {
    setScheduleDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev; // Keep at least one day
        return prev.filter((d) => d !== dayId);
      }
      return [...prev, dayId].sort((a, b) => a - b);
    });
  };

  const validate = () => {
    const res = validateCommitmentInput({
      title,
      description: description || undefined,
      frequency,
      schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
      tone,
      start_date: startDate,
    });
    setErrors(res.errors);
    return res.valid;
  };

  const handleNextOrSave = async () => {
    if (!validate()) return;

    if (isFirstCommitment && step === "form") {
      setSaving(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrors({ form: "You must be signed in to create a commitment." });
        setSaving(false);
        return;
      }

      // Save draft commitment to database
      if (!draftId) {
        const { data: createdDraft, error } = await supabase
          .from("commitments")
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim() || null,
            frequency,
            schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
            start_date: startDate,
            tone,
            status: "draft",
          })
          .select()
          .single();

        setSaving(false);
        if (error || !createdDraft) {
          setErrors({ form: error?.message || "Failed to save draft commitment." });
          return;
        }
        setDraftId(createdDraft.id);
      } else {
        const { error } = await supabase
          .from("commitments")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            frequency,
            schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
            start_date: startDate,
            tone,
          })
          .eq("id", draftId);

        setSaving(false);
        if (error) {
          setErrors({ form: error.message });
          return;
        }
      }

      setStep("review");
      return;
    }

    // Standard create or update for existing active journey
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrors({ form: "You must be signed in to perform this action." });
      setSaving(false);
      return;
    }

    if (isEditing && commitment) {
      const { data: updated, error } = await supabase
        .from("commitments")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
          tone,
        })
        .eq("id", commitment.id)
        .select()
        .single();

      setSaving(false);
      if (error || !updated) {
        setErrors({ form: error?.message || "Failed to update commitment." });
        return;
      }
      toast({
        title: "Commitment updated",
        description: `"${updated.title}" has been updated.`,
        tone: "success",
      });
      onSuccess(updated as Commitment);
      onOpenChange(false);
    } else {
      // Adding additional commitment directly as active
      const { data: created, error } = await supabase
        .from("commitments")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
          start_date: startDate,
          tone,
          status: "active",
        })
        .select()
        .single();

      setSaving(false);
      if (error || !created) {
        setErrors({ form: error?.message || "Failed to create commitment." });
        return;
      }
      toast({
        title: "Commitment added",
        description: `"${created.title}" is now active.`,
        tone: "success",
      });
      onSuccess(created as Commitment);
      onOpenChange(false);
    }
  };

  const handleConfirmICommit = async () => {
    if (!draftId) return;

    setSaving(true);
    const supabase = createClient();
    const localDate = getUserLocalDateString(userTimezone);

    const { data, error } = await supabase.rpc("confirm_first_commitment", {
      commitment_id: draftId,
      client_local_date: localDate,
    });

    setSaving(false);

    if (error) {
      setErrors({ form: error.message });
      toast({
        title: "Confirmation failed",
        description: error.message,
        tone: "error",
      });
      return;
    }

    const res = data as unknown as { commitment: Commitment; myc_started_at: string };
    toast({
      title: "I COMMIT confirmed",
      description: `Your MYC consistency journey has officially begun on ${res.myc_started_at}.`,
      tone: "success",
    });

    onSuccess(res.commitment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="type-h2">
                {isFirstCommitment
                  ? "Define your first commitment"
                  : isEditing
                    ? "Edit commitment"
                    : "New commitment"}
              </DialogTitle>
              <DialogDescription>
                {isFirstCommitment
                  ? "Start with one meaningful action you can realistically maintain every day."
                  : "Keep your commitments clear and realistic. Showing up is what counts."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {errors.form && <FieldError>{errors.form}</FieldError>}

              <Field>
                <Label htmlFor="commitment-title">Commitment title</Label>
                <Input
                  id="commitment-title"
                  placeholder="e.g. Solve 3 DSA problems, Workout, Read 20 pages"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
                {errors.title ? (
                  <FieldError>{errors.title}</FieldError>
                ) : (
                  <FieldHint>What specific action will you take?</FieldHint>
                )}
              </Field>

              <Field>
                <Label id="commitment-frequency-label">Frequency</Label>
                <SegmentedControl
                  aria-label="Commitment frequency"
                  options={[
                    { value: "daily", label: "Every day" },
                    { value: "specific_days", label: "Selected days" },
                  ]}
                  value={frequency}
                  onValueChange={(val) => setFrequency(val as CommitmentFrequency)}
                />
                {errors.frequency && <FieldError>{errors.frequency}</FieldError>}
              </Field>

              {frequency === "specific_days" && (
                <Field>
                  <Label id="schedule-days-label">Select days of the week</Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WEEKDAYS.map((day) => {
                      const selected = scheduleDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          aria-pressed={selected}
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl type-small font-semibold transition-colors duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
                            selected
                              ? "bg-primary text-primary-foreground shadow-raised"
                              : "border border-border/80 bg-secondary text-muted-foreground hover:bg-card hover:text-foreground",
                          )}
                        >
                          {day.letter}
                        </button>
                      );
                    })}
                  </div>
                  {errors.schedule_days && <FieldError>{errors.schedule_days}</FieldError>}
                </Field>
              )}

              <Field>
                <Label htmlFor="commitment-description">Description (optional)</Label>
                <Textarea
                  id="commitment-description"
                  placeholder="Any details, context, or minimum bar for this commitment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
                {errors.description && <FieldError>{errors.description}</FieldError>}
              </Field>

              <Field>
                <Label id="commitment-tone-label">Card accent color</Label>
                <div className="flex items-center gap-2.5 pt-1">
                  {VALID_TONES.map((t) => {
                    const selected = tone === t;
                    const meta = TONE_CLASSES[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        aria-label={`Select ${t} tone`}
                        className={cn(
                          "relative grid size-8 place-content-center rounded-full border transition-all duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
                          meta.bg,
                          meta.border,
                          selected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "",
                        )}
                      >
                        {selected && <CheckIcon className={cn("size-4", meta.text)} />}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleNextOrSave} disabled={saving}>
                {saving
                  ? "Saving..."
                  : isFirstCommitment
                    ? "Review commitment"
                    : isEditing
                      ? "Save changes"
                      : "Add commitment"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 type-h2">
                <SparklesIcon className="size-5 text-primary" />
                Review your first commitment
              </DialogTitle>
              <DialogDescription>
                This is the foundation of your MYC journey. Confirm when you are ready to begin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-3">
              {errors.form && <FieldError>{errors.form}</FieldError>}

              <div
                className={cn(
                  "grid gap-3 rounded-2xl border p-5 shadow-raised",
                  TONE_CLASSES[tone].bg,
                  TONE_CLASSES[tone].border,
                )}
              >
                <div className="grid gap-1">
                  <p className="type-eyebrow text-muted-foreground">First commitment</p>
                  <p className="type-h2 font-semibold text-foreground">{title}</p>
                </div>

                {description && <p className="type-small text-foreground/80">{description}</p>}

                <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 type-small">
                  <div>
                    <span className="text-muted-foreground">Frequency: </span>
                    <span className="font-semibold text-foreground">
                      {frequency === "daily"
                        ? "Every day"
                        : scheduleDays
                            .map((d) => WEEKDAYS.find((w) => w.id === d)?.short)
                            .join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start date: </span>
                    <span className="font-semibold text-foreground">{startDate} (Today)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 text-center type-small text-muted-foreground shadow-raised">
                <p className="font-medium text-foreground">
                  The official MYC journey begins upon confirmation.
                </p>
                <p className="pt-1">
                  Your consistency history starts today. Showing up every day builds proof that you
                  keep your word to yourself.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("form")} disabled={saving}>
                Edit Details
              </Button>
              <Button
                size="lg"
                onClick={handleConfirmICommit}
                disabled={saving}
                className="bg-primary font-bold tracking-wide text-primary-foreground shadow-floating hover:brightness-105 active:scale-95"
              >
                {saving ? "Confirming..." : "I COMMIT"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
