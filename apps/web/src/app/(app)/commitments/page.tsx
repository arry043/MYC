import { cn } from "cn";
import { FlameIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { LinearProgress } from "@/components/progress/linear-progress";
import { Stagger, StaggerItem } from "@/components/shared/motion";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, cardVariants } from "@/components/ui/card";
import { sampleCommitments, type SampleCommitment } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Commitments" };

const tileTone: Record<SampleCommitment["tone"], string> = {
  sky: "bg-primary-soft text-primary-soft-foreground",
  lavender: "bg-lavender text-lavender-foreground",
  peach: "bg-peach text-peach-foreground",
  mint: "bg-mint text-mint-foreground",
  sun: "bg-sun text-sun-foreground",
};

function CommitmentCard({ commitment }: { commitment: SampleCommitment }) {
  const paused = commitment.status === "paused";
  return (
    <Card className={cn("h-full gap-5", paused && "bg-card/60")}>
      <CardHeader>
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-content-center rounded-2xl type-h3",
            tileTone[commitment.tone],
          )}
        >
          {commitment.title[0]}
        </span>
        {paused ? (
          <Badge tone="neutral">
            <StatusDot />
            Paused
          </Badge>
        ) : (
          <Badge tone="success">
            <StatusDot />
            Active
          </Badge>
        )}
      </CardHeader>
      <div className="grid gap-1">
        <CardTitle className="type-h2">{commitment.title}</CardTitle>
        <p className="type-small text-muted-foreground">{commitment.schedule}</p>
      </div>
      <LinearProgress
        value={commitment.consistency}
        label="Consistency, last 30 days"
        showLabel
        size="sm"
      />
      <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 type-small text-muted-foreground">
        <FlameIcon aria-hidden className="size-4 text-peach-foreground" />
        {paused ? (
          "Streak resumes when you do"
        ) : (
          <>
            <span className="font-semibold text-foreground">{commitment.streakDays} days</span> in a
            row
          </>
        )}
      </p>
    </Card>
  );
}

export default function CommitmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Commitments"
        title="What you've committed to"
        description="Keep the list short and honest. A few commitments kept beat many abandoned."
        actions={
          <Button className="max-sm:w-full">
            <PlusIcon />
            New commitment
          </Button>
        }
      />

      <Stagger className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3">
        {sampleCommitments.map((commitment) => (
          <StaggerItem key={commitment.id}>
            <CommitmentCard commitment={commitment} />
          </StaggerItem>
        ))}
        <StaggerItem>
          <button
            type="button"
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
      </Stagger>
    </>
  );
}
