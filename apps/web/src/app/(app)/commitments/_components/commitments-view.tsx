"use client";

import { cn } from "cn";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarIcon,
  CheckIcon,
  CircleIcon,
  HistoryIcon,
  MoreVerticalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  Commitment,
  CommitmentStatus,
  CommitmentTone,
  DailyCompletion,
  Profile,
} from "@myc/types";
import { formatCommitmentDate, formatFrequency, isCommitmentExpectedOnDate } from "@myc/utils";

import { CommitmentDialog } from "@/components/commitments/commitment-dialog";
import { CommitmentHistoryDialog } from "@/components/commitments/commitment-history-dialog";
import { CompleteCommitmentDialog } from "@/components/commitments/complete-commitment-dialog";
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
  const router = useRouter();
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
  const [completingCommitment, setCompletingCommitment] = useState<Commitment | null>(null);
  const [historyCommitment, setHistoryCommitment] = useState<Commitment | null>(null);

  const hasStartedMyc = Boolean(profile?.myc_started_at);
  const isFirstCommitmentFlow = !hasStartedMyc;

  // Sync state during rendering when server re-renders with fresh data
  const [prevInitialCommitments, setPrevInitialCommitments] = useState(initialCommitments);
  if (initialCommitments !== prevInitialCommitments) {
    setPrevInitialCommitments(initialCommitments);
    setCommitments(initialCommitments);
    setProfile(initialProfile);
    if (initialTodayCompletions) {
      setTodayCompletions(initialTodayCompletions);
    }
  }

  // Realtime subscription for cross-device sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("web:commitments:sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_completions",
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commitments",
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    const handleSync = () => {
      router.refresh();
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("online", handleSync);

    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("online", handleSync);
      supabase.removeChannel(channel);
    };
  }, [router]);

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

  const handleCompletionSuccess = (completion: DailyCompletion) => {
    setTodayCompletions((prev) => [...prev, completion]);
    router.refresh();
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
            onValueChange={(val) => setFilter(val as typeof filter)}
          />

          <p className="type-caption text-muted-foreground">
            {commitments.length} total commitment{commitments.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Empty state: No commitments at all */}
        {commitments.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <SparklesIcon className="size-7" />
            </div>
            <div className="flex max-w-md flex-col gap-1.5">
              <CardTitle className="type-h3">
                {isFirstCommitmentFlow
                  ? "Define your first commitment"
                  : "No commitments in this view"}
              </CardTitle>
              <p className="type-small text-muted-foreground">
                {isFirstCommitmentFlow
                  ? "Start with one small, realistic daily action. When you confirm your commitment, your MYC journey officially begins."
                  : "Create a new commitment to keep building your consistency."}
              </p>
            </div>
            <Button onClick={handleOpenCreate} size="lg" className="mt-2">
              <PlusIcon />
              {isFirstCommitmentFlow ? "Begin my first commitment" : "New commitment"}
            </Button>
          </Card>
        )}

        {/* Empty state: Filter returned nothing */}
        {commitments.length > 0 && filteredCommitments.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="type-h3">No {filter} commitments</p>
            <p className="type-small text-muted-foreground">
              You don&apos;t have any commitments with status &quot;{filter}&quot;.
            </p>
            {filter !== "active" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter("active")}
                className="mt-2"
              >
                View active commitments
              </Button>
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
                            <DropdownMenuItem onClick={() => setHistoryCommitment(commitment)}>
                              <HistoryIcon className="size-4" />
                              View history
                            </DropdownMenuItem>

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
                        {formatFrequency(
                          commitment.frequency,
                          commitment.schedule_days,
                          commitment.scheduled_date,
                        )}
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
                        {commitment.frequency === "single_day"
                          ? `Scheduled for ${formatCommitmentDate(commitment.scheduled_date || commitment.start_date)}`
                          : `Started ${commitment.start_date}`}
                      </span>

                      <div className="flex items-center gap-2">
                        {commitment.status === "active" &&
                          (isScheduledToday ? (
                            isDoneToday ? (
                              <div
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600"
                                aria-label={`"${commitment.title}" completed for today`}
                              >
                                <CheckIcon className="size-3.5 stroke-[2.5]" />
                                <span>Done</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCompletingCommitment(commitment)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-2.5 py-1 type-caption font-semibold text-foreground/80 transition-all duration-150 outline-none hover:border-foreground/40 focus-visible:ring-4 focus-visible:ring-ring/30"
                              >
                                <CircleIcon className="size-3 text-muted-foreground" />
                                <span>Mark done</span>
                              </button>
                            )
                          ) : (
                            <span className="type-caption text-muted-foreground/75">
                              Not scheduled today
                            </span>
                          ))}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setHistoryCommitment(commitment)}
                          aria-label={`View history for ${commitment.title}`}
                          title="View commitment history"
                        >
                          <HistoryIcon className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
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

      {/* Complete Commitment Confirmation Dialog */}
      <CompleteCommitmentDialog
        isOpen={Boolean(completingCommitment)}
        onClose={() => setCompletingCommitment(null)}
        commitment={completingCommitment}
        date={effectiveToday}
        onSuccess={(completion) => {
          handleCompletionSuccess(completion);
          setCompletingCommitment(null);
        }}
      />

      {/* Commitment History Dialog */}
      <CommitmentHistoryDialog
        isOpen={Boolean(historyCommitment)}
        onClose={() => setHistoryCommitment(null)}
        commitment={historyCommitment}
        timezone={profile?.timezone || "UTC"}
      />
    </>
  );
}
