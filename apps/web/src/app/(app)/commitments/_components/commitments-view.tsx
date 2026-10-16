"use client";

import { cn } from "cn";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarIcon,
  CheckIcon,
  CircleIcon,
  MoreVerticalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type {
  Commitment,
  CommitmentStatus,
  CommitmentTone,
  DailyCompletion,
  Profile,
} from "@myc/types";
import {
  completeCommitment,
  formatFrequency,
  isCommitmentExpectedOnDate,
  uncompleteCommitment,
} from "@myc/utils";

import { CommitmentDialog } from "@/components/commitments/commitment-dialog";
import { DeleteCommitmentDialog } from "@/components/commitments/delete-commitment-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, cardVariants } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const TILE_TONE: Record<CommitmentTone, string> = {
  sky: "bg-primary-soft text-primary-soft-foreground",
  lavender: "bg-lavender text-lavender-foreground",
  peach: "bg-peach text-peach-foreground",
  mint: "bg-mint text-mint-foreground",
  sun: "bg-sun text-sun-foreground",
};

interface CommitmentsViewProps {
  initialCommitments: Commitment[];
  initialProfile: Profile | null;
  initialTodayCompletions?: DailyCompletion[];
  todayDate?: string;
}

export function CommitmentsView({
  initialCommitments,
  initialProfile,
  initialTodayCompletions,
  todayDate,
}: CommitmentsViewProps) {
  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [todayCompletions, setTodayCompletions] = useState<DailyCompletion[]>(
    initialTodayCompletions || [],
  );
  const [filter, setFilter] = useState<"active" | "paused" | "archived">("active");

  // Modal dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);

  const hasStartedMyc = Boolean(profile?.myc_started_at);
  const isFirstCommitmentFlow = !hasStartedMyc;

  const filteredCommitments = commitments.filter((c) => c.status === filter);

  // Status updates (pause, resume, archive)
  const handleUpdateStatus = async (commitment: Commitment, nextStatus: CommitmentStatus) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("commitments")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", commitment.id);

    if (error) {
      toast({
        title: "Could not update status",
        description: error.message,
        tone: "error",
      });
      return;
    }

    setCommitments((prev) =>
      prev.map((c) => (c.id === commitment.id ? { ...c, status: nextStatus } : c)),
    );

    const actionText =
      nextStatus === "paused"
        ? "paused"
        : nextStatus === "active"
          ? "resumed"
          : nextStatus === "archived"
            ? "archived"
            : "updated";

    toast({
      title: `Commitment ${actionText}`,
      description: `"${commitment.title}" is now ${nextStatus}.`,
      tone: "success",
    });
  };

  const handleOpenCreate = () => {
    setEditingCommitment(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Commitment) => {
    setEditingCommitment(c);
    setDialogOpen(true);
  };

  const handleOpenDelete = (c: Commitment) => {
    setDeletingCommitment(c);
    setDeleteDialogOpen(true);
  };

  const handleCommitmentSaved = (saved: Commitment) => {
    setCommitments((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });

    if (isFirstCommitmentFlow) {
      // Re-fetch profile to capture established myc_started_at
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("*")
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
    }
  };

  const handleCommitmentDeleted = (deletedId: string) => {
    setCommitments((prev) => prev.filter((c) => c.id !== deletedId));
    setTodayCompletions((prev) => prev.filter((c) => c.commitment_id !== deletedId));
  };

  const effectiveToday = todayDate || new Date().toISOString().slice(0, 10);

  const handleToggleCompletion = async (commitmentId: string) => {
    const isDone = todayCompletions.some(
      (c) => c.commitment_id === commitmentId && c.date === effectiveToday,
    );
    const supabase = createClient();

    const prevComps = [...todayCompletions];
    if (!isDone) {
      const mockComp: DailyCompletion = {
        id: `opt-${Date.now()}`,
        user_id: profile?.user_id || "",
        commitment_id: commitmentId,
        date: effectiveToday,
        status: "completed",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setTodayCompletions([...todayCompletions, mockComp]);
      const { data, error } = await completeCommitment(supabase, commitmentId, effectiveToday);
      if (error) {
        setTodayCompletions(prevComps);
        toast({ title: "Could not mark done", description: error, tone: "error" });
      } else if (data) {
        setTodayCompletions((prev) =>
          prev.map((c) =>
            c.commitment_id === commitmentId && c.date === effectiveToday ? data : c,
          ),
        );
      }
    } else {
      setTodayCompletions(
        todayCompletions.filter(
          (c) => !(c.commitment_id === commitmentId && c.date === effectiveToday),
        ),
      );
      const { error } = await uncompleteCommitment(supabase, commitmentId, effectiveToday);
      if (error) {
        setTodayCompletions(prevComps);
        toast({ title: "Could not undo", description: error, tone: "error" });
      }
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Commitments"
        title="What you've committed to"
        description="Keep the list short and honest. A few commitments kept beat many abandoned."
        actions={
          <Button onClick={handleOpenCreate} className="max-sm:w-full">
            <PlusIcon />
            New commitment
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Filter controls */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <SegmentedControl
            aria-label="Filter commitments by status"
            options={[
              {
                value: "active",
                label: `Active (${commitments.filter((c) => c.status === "active").length})`,
              },
              {
                value: "paused",
                label: `Paused (${commitments.filter((c) => c.status === "paused").length})`,
              },
              {
                value: "archived",
                label: `Archived (${commitments.filter((c) => c.status === "archived").length})`,
              },
            ]}
            value={filter}
            onValueChange={(val) => setFilter(val as "active" | "paused" | "archived")}
          />

          {!hasStartedMyc && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 type-small font-medium text-primary hover:underline"
            >
              <SparklesIcon className="size-4" />
              View onboarding guide
            </Link>
          )}
        </div>

        {/* Empty state when user hasn't confirmed first commitment */}
        {!hasStartedMyc && commitments.length === 0 && (
          <Card className="gap-6 p-8 text-center sm:p-12">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground shadow-raised">
              <SparklesIcon className="size-7" />
            </div>
            <div className="mx-auto grid max-w-md gap-2">
              <h2 className="type-h2">You haven&apos;t started your MYC journey yet</h2>
              <p className="type-body text-muted-foreground">
                Your journey officially begins when you define and confirm your first commitment
                through &ldquo;I COMMIT&rdquo;.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={handleOpenCreate}
                className="font-semibold shadow-floating"
              >
                Make your first commitment
              </Button>
            </div>
          </Card>
        )}

        {/* Empty state for current tab when user has commitments */}
        {(hasStartedMyc || commitments.length > 0) && filteredCommitments.length === 0 && (
          <Card className="gap-4 p-8 text-center sm:p-10">
            <p className="type-h3">No {filter} commitments</p>
            <p className="type-small text-muted-foreground">
              {filter === "active"
                ? "You have no active commitments. Resume a paused one or create a new commitment."
                : filter === "paused"
                  ? "You have no paused commitments. Pausing is a healthy way to hold a commitment without breaking consistency."
                  : "You have no archived commitments."}
            </p>
            {filter === "active" && (
              <div className="pt-2">
                <Button variant="secondary" onClick={handleOpenCreate}>
                  <PlusIcon />
                  Add a commitment
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Commitments grid */}
        {filteredCommitments.length > 0 && (
          <Stagger className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3">
            {filteredCommitments.map((commitment) => {
              const tone = (commitment.tone as CommitmentTone) || "sky";
              const isPaused = commitment.status === "paused";
              const isArchived = commitment.status === "archived";

              const isScheduledToday = isCommitmentExpectedOnDate(
                commitment,
                effectiveToday,
                profile?.myc_started_at,
              );
              const isDoneToday = todayCompletions.some(
                (c) => c.commitment_id === commitment.id && c.date === effectiveToday,
              );

              return (
                <StaggerItem key={commitment.id}>
                  <Card
                    className={cn(
                      "group/card h-full gap-5 transition-[box-shadow,border-color] duration-200",
                      isPaused && "bg-card/60 opacity-90",
                      isArchived && "bg-card/40 opacity-75",
                    )}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-11 shrink-0 place-content-center rounded-2xl type-h3 font-semibold",
                          TILE_TONE[tone],
                        )}
                      >
                        {commitment.title[0]?.toUpperCase() || "C"}
                      </span>

                      <div className="flex items-center gap-2">
                        {isPaused ? (
                          <Badge tone="neutral">
                            <StatusDot />
                            Paused
                          </Badge>
                        ) : isArchived ? (
                          <Badge tone="neutral">Archived</Badge>
                        ) : (
                          <Badge tone="success">
                            <StatusDot />
                            Active
                          </Badge>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Options for ${commitment.title}`}
                            className="grid size-8 place-content-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
                          >
                            <MoreVerticalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(commitment)}>
                              <PencilIcon className="size-4" />
                              Edit commitment
                            </DropdownMenuItem>

                            {commitment.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(commitment, "paused")}
                              >
                                <PauseIcon className="size-4" />
                                Pause commitment
                              </DropdownMenuItem>
                            )}

                            {commitment.status === "paused" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(commitment, "active")}
                              >
                                <PlayIcon className="size-4" />
                                Resume commitment
                              </DropdownMenuItem>
                            )}

                            {commitment.status !== "archived" ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(commitment, "archived")}
                              >
                                <ArchiveIcon className="size-4" />
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(commitment, "active")}
                              >
                                <ArchiveRestoreIcon className="size-4" />
                                Restore to active
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(commitment)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2Icon className="size-4" />
                              Delete commitment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <div className="grid gap-1">
                      <CardTitle className="type-h3 font-semibold">{commitment.title}</CardTitle>
                      <p className="type-small font-medium text-primary">
                        {formatFrequency(commitment.frequency, commitment.schedule_days)}
                      </p>
                      {commitment.description && (
                        <p className="line-clamp-2 pt-1 type-small text-muted-foreground">
                          {commitment.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 type-caption text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5" />
                        Started {commitment.start_date}
                      </span>

                      {commitment.status === "active" &&
                        (isScheduledToday ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCompletion(commitment.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 type-caption font-semibold transition-all duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
                              isDoneToday
                                ? "bg-mint text-mint-foreground hover:opacity-90"
                                : "border border-input bg-card text-foreground/80 hover:border-foreground/40",
                            )}
                          >
                            {isDoneToday ? (
                              <>
                                <CheckIcon className="size-3.5 stroke-[2.5]" />
                                <span>Done today</span>
                              </>
                            ) : (
                              <>
                                <CircleIcon className="size-3 text-muted-foreground" />
                                <span>Mark done</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="type-caption text-muted-foreground/75">
                            Not scheduled today
                          </span>
                        ))}
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}

            {filter === "active" && (
              <StaggerItem>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className={cn(
                    cardVariants({ tone: "dashed", interactive: true }),
                    "h-full min-h-48 w-full items-center justify-center text-center text-muted-foreground hover:border-primary/50 hover:bg-card/60 hover:text-foreground",
                  )}
                >
                  <span className="grid size-11 place-content-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                    <PlusIcon aria-hidden className="size-5" />
                  </span>
                  <span className="type-label">Add a commitment</span>
                </button>
              </StaggerItem>
            )}
          </Stagger>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <CommitmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        commitment={editingCommitment}
        isFirstCommitment={isFirstCommitmentFlow && !editingCommitment}
        userTimezone={profile?.timezone}
        onSuccess={handleCommitmentSaved}
      />

      {/* Delete Dialog */}
      <DeleteCommitmentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        commitment={deletingCommitment}
        onDeleted={handleCommitmentDeleted}
      />
    </>
  );
}
