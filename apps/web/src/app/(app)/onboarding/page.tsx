"use client";

import { cn } from "cn";
import {
  ArrowRightIcon,
  CheckIcon,
  FlameIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Commitment, CommitmentFrequency, CommitmentTone, Weekday } from "@myc/types";
import { getUserLocalDateString, VALID_TONES, validateCommitmentInput, WEEKDAYS } from "@myc/utils";

import { FadeIn } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(true);
  const [draftCommitment, setDraftCommitment] = useState<Commitment | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>("UTC");

  // Form states for first commitment
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<CommitmentFrequency>("daily");
  const [scheduleDays, setScheduleDays] = useState<Weekday[]>([1, 2, 3, 4, 5, 6, 7]);
  const [tone, setTone] = useState<CommitmentTone>("sky");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkState() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Detect timezone
      let tz = "UTC";
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) tz = detected;
      } catch {
        // fallback
      }
      setUserTimezone(tz);

      const { data: profile } = await supabase.rpc("ensure_profile", {
        detected_timezone: tz,
      });

      // If user already started MYC, onboarding is already complete
      if (profile?.myc_started_at) {
        router.replace("/dashboard");
        return;
      }

      // Check if user has an existing draft or active commitment
      const { data: commitments } = await supabase
        .from("commitments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (commitments && commitments.length > 0) {
        const draft = commitments.find((c) => c.status === "draft");
        if (draft) {
          setDraftCommitment(draft as Commitment);
          setTitle(draft.title);
          setDescription(draft.description || "");
          setFrequency((draft.frequency as CommitmentFrequency) || "daily");
          setScheduleDays((draft.schedule_days as Weekday[]) || [1, 2, 3, 4, 5, 6, 7]);
          setTone((draft.tone as CommitmentTone) || "sky");
        }
      }

      setLoading(false);
    }

    checkState();
  }, [router]);

  const toggleDay = (dayId: Weekday) => {
    setScheduleDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayId);
      }
      return [...prev, dayId].sort((a, b) => a - b);
    });
  };

  const handleCreateDraft = async () => {
    const res = validateCommitmentInput({
      title,
      description: description || undefined,
      frequency,
      schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
      tone,
    });

    if (!res.valid) {
      setErrors(res.errors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const todayDate = getUserLocalDateString(userTimezone);

    if (draftCommitment) {
      const { data: updated, error } = await supabase
        .from("commitments")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
          tone,
          start_date: todayDate,
        })
        .eq("id", draftCommitment.id)
        .select()
        .single();

      setSubmitting(false);

      if (error || !updated) {
        setErrors({ form: error?.message || "Failed to update draft." });
        return;
      }

      setDraftCommitment(updated as Commitment);
      setStep(4);
    } else {
      const { data: created, error } = await supabase
        .from("commitments")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          schedule_days: frequency === "specific_days" ? scheduleDays : [1, 2, 3, 4, 5, 6, 7],
          tone,
          start_date: todayDate,
          status: "draft",
        })
        .select()
        .single();

      setSubmitting(false);

      if (error || !created) {
        setErrors({ form: error?.message || "Failed to create draft." });
        return;
      }

      setDraftCommitment(created as Commitment);
      setStep(4);
    }
  };

  const handleConfirmICommit = async () => {
    if (!draftCommitment) return;

    setSubmitting(true);
    const supabase = createClient();
    const localDate = getUserLocalDateString(userTimezone);

    const { data, error } = await supabase.rpc("confirm_first_commitment", {
      commitment_id: draftCommitment.id,
      client_local_date: localDate,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Could not confirm commitment",
        description: error.message,
        tone: "error",
      });
      return;
    }

    const res = data as unknown as { commitment: Commitment; myc_started_at: string };
    setDraftCommitment(res.commitment);
    setStep(5);
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
        <SparklesIcon className="size-8 animate-pulse text-primary" />
        <p className="mt-4 type-small text-muted-foreground">Preparing your MYC space...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-page py-10">
      {/* Step Indicators */}
      {step < 5 && (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step === s ? "w-8 bg-primary" : step > s ? "w-4 bg-primary/40" : "w-4 bg-border",
                )}
              />
            ))}
          </div>
          <span className="type-caption font-medium text-muted-foreground">Step {step} of 4</span>
        </div>
      )}

      {/* STEP 1: Welcome & Philosophy */}
      {step === 1 && (
        <FadeIn className="grid gap-6">
          <div className="grid gap-2">
            <span className="type-eyebrow font-semibold text-primary">Welcome to MYC</span>
            <h1 className="type-display">Don&apos;t rely on motivation. Build consistency.</h1>
            <p className="type-body text-muted-foreground">
              Most productivity apps fail because they demand perfection. MYC is built for the long
              run: simple daily commitments and undeniable proof of showing up.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <TargetIcon className="size-5" />
              </span>
              <p className="type-h3 font-semibold">Consistency &gt; Motivation</p>
              <p className="type-small text-muted-foreground">
                Small actions repeated every day compound into permanent identity.
              </p>
            </Card>

            <Card className="gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-peach text-peach-foreground">
                <FlameIcon className="size-5" />
              </span>
              <p className="type-h3 font-semibold">Never Miss Twice</p>
              <p className="type-small text-muted-foreground">
                A missed day is neutral, not a failure. Miss once, come back tomorrow.
              </p>
            </Card>

            <Card className="gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-mint text-mint-foreground">
                <ShieldCheckIcon className="size-5" />
              </span>
              <p className="type-h3 font-semibold">Proof Over Promises</p>
              <p className="type-small text-muted-foreground">
                Your calendar and streaks show tangible proof of what you do.
              </p>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button size="lg" onClick={() => setStep(2)}>
              Continue
              <ArrowRightIcon />
            </Button>
          </div>
        </FadeIn>
      )}

      {/* STEP 2: How Commitments Work */}
      {step === 2 && (
        <FadeIn className="grid gap-6">
          <div className="grid gap-2">
            <span className="type-eyebrow font-semibold text-primary">The Core Unit</span>
            <h1 className="type-display">What is a commitment?</h1>
            <p className="type-body text-muted-foreground">
              A commitment in MYC is a repeatable promise to yourself. It is not an endless to-do
              list or a collection of random tasks.
            </p>
          </div>

          <Card className="gap-4 p-6">
            <p className="type-label text-foreground">Good examples of commitments:</p>
            <ul className="grid gap-2.5 type-small text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <CheckIcon className="size-4 text-primary" />
                <span>
                  <strong className="text-foreground">Solve 3 DSA problems</strong> · Daily
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckIcon className="size-4 text-primary" />
                <span>
                  <strong className="text-foreground">Workout</strong> · Mon, Wed, Fri
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckIcon className="size-4 text-primary" />
                <span>
                  <strong className="text-foreground">Read 20 pages</strong> · Every day
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckIcon className="size-4 text-primary" />
                <span>
                  <strong className="text-foreground">Work on side project for 1 hour</strong> ·
                  Weekdays
                </span>
              </li>
            </ul>
          </Card>

          <div className="rounded-xl border border-border/80 bg-card p-4 type-small text-muted-foreground shadow-raised">
            <p className="font-semibold text-foreground">Start small.</p>
            <p className="pt-0.5">
              One commitment kept consistently builds more momentum than four commitments abandoned
              next week.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" onClick={() => setStep(3)}>
              Define your first commitment
              <ArrowRightIcon />
            </Button>
          </div>
        </FadeIn>
      )}

      {/* STEP 3: First Commitment Form */}
      {step === 3 && (
        <FadeIn className="grid gap-6">
          <div className="grid gap-2">
            <span className="type-eyebrow font-semibold text-primary">Step 3 of 4</span>
            <h1 className="type-display">Define your first commitment</h1>
            <p className="type-body text-muted-foreground">
              Choose one habit you want to build right now. You can add more later once this is
              established.
            </p>
          </div>

          <Card className="gap-5 p-6 shadow-raised">
            {errors.form && <FieldError>{errors.form}</FieldError>}

            <Field>
              <Label htmlFor="onboarding-title">Commitment title</Label>
              <Input
                id="onboarding-title"
                placeholder="e.g. Solve 3 DSA problems, Workout, Read 20 pages"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                autoFocus
              />
              {errors.title ? (
                <FieldError>{errors.title}</FieldError>
              ) : (
                <FieldHint>What will you do to show up today?</FieldHint>
              )}
            </Field>

            <Field>
              <Label id="onboarding-freq-label">Frequency</Label>
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
                <Label id="onboarding-days-label">Select days of the week</Label>
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
              <Label htmlFor="onboarding-description">Description (optional)</Label>
              <Textarea
                id="onboarding-description"
                placeholder="Add context or define what counts as done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              {errors.description && <FieldError>{errors.description}</FieldError>}
            </Field>

            <Field>
              <Label id="onboarding-tone-label">Card accent color</Label>
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
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button size="lg" onClick={handleCreateDraft} disabled={submitting}>
              {submitting ? "Saving..." : "Review commitment"}
              <ArrowRightIcon />
            </Button>
          </div>
        </FadeIn>
      )}

      {/* STEP 4: Review Screen & "I COMMIT" */}
      {step === 4 && (
        <FadeIn className="grid gap-6">
          <div className="grid gap-2">
            <span className="type-eyebrow font-semibold text-primary">Final Step</span>
            <h1 className="type-display">Review your commitment</h1>
            <p className="type-body text-muted-foreground">
              Confirming this commitment officially starts your MYC consistency journey.
            </p>
          </div>

          <Card
            className={cn(
              "gap-4 border p-6 shadow-floating",
              TONE_CLASSES[tone].bg,
              TONE_CLASSES[tone].border,
            )}
          >
            <CardHeader>
              <div className="grid gap-1">
                <span className="type-eyebrow text-muted-foreground">Your first commitment</span>
                <CardTitle className="type-h2 font-semibold text-foreground">{title}</CardTitle>
              </div>
            </CardHeader>

            {description && <p className="type-small text-foreground/85">{description}</p>}

            <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4 type-small">
              <div>
                <span className="text-muted-foreground">Frequency: </span>
                <span className="font-semibold text-foreground">
                  {frequency === "daily"
                    ? "Every day"
                    : scheduleDays.map((d) => WEEKDAYS.find((w) => w.id === d)?.short).join(", ")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Date: </span>
                <span className="font-semibold text-foreground">
                  {getUserLocalDateString(userTimezone)} (Today)
                </span>
              </div>
            </div>
          </Card>

          <div className="rounded-xl border border-border/80 bg-card p-5 text-center shadow-raised">
            <p className="type-body font-semibold text-foreground">
              This is the official start of your journey.
            </p>
            <p className="pt-1 type-small text-muted-foreground">
              When you press &ldquo;I COMMIT&rdquo;, your journey officially begins and today&apos;s
              date is permanently recorded as your start date.
            </p>
          </div>

          <div className="flex justify-between pt-4 max-sm:flex-col-reverse max-sm:gap-3">
            <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting}>
              Edit Commitment
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmICommit}
              disabled={submitting}
              className="bg-primary px-8 py-3 text-base font-bold tracking-wide text-primary-foreground shadow-floating hover:brightness-105 active:scale-95"
            >
              {submitting ? "Confirming..." : "I COMMIT"}
            </Button>
          </div>
        </FadeIn>
      )}

      {/* STEP 5: Journey Officially Begun Confirmation */}
      {step === 5 && (
        <FadeIn className="grid gap-6 py-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-floating">
            <SparklesIcon className="size-8" />
          </div>

          <div className="mx-auto grid max-w-md gap-2">
            <span className="type-eyebrow font-semibold text-primary">Journey Active</span>
            <h1 className="type-display">You are committed.</h1>
            <p className="type-body text-muted-foreground">
              Your MYC consistency journey has officially begun. Show up for &ldquo;
              <span className="font-semibold text-foreground">{draftCommitment?.title}</span>
              &rdquo; today.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <Button size="lg" onClick={() => router.push("/commitments")}>
              View commitments
              <ArrowRightIcon />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
