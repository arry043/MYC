import { cn } from "cn";
import { CircleCheckIcon, CircleIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { SampleCommitment } from "@/lib/sample-data";

const dotTone: Record<SampleCommitment["tone"], string> = {
  sky: "bg-sky",
  lavender: "bg-lavender-foreground",
  peach: "bg-peach-foreground",
  mint: "bg-mint-foreground",
  sun: "bg-sun-foreground",
};

/** Read-only preview of today's commitments. Completing them arrives in task 08. */
function TodayList({ commitments }: { commitments: readonly SampleCommitment[] }) {
  return (
    <Card className="gap-0 py-2">
      <ul className="divide-y divide-border/70">
        {commitments.map((commitment) => (
          <li key={commitment.id} className="flex items-center gap-3.5 py-3.5">
            {commitment.doneToday ? (
              <CircleCheckIcon aria-hidden className="size-6 shrink-0 fill-primary text-card" />
            ) : (
              <CircleIcon aria-hidden className="size-6 shrink-0 text-input" strokeWidth={1.75} />
            )}
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p
                className={cn(
                  "truncate type-label",
                  commitment.doneToday && "text-muted-foreground line-through decoration-border",
                )}
              >
                {commitment.title}
              </p>
              <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", dotTone[commitment.tone])}
                />
                {commitment.schedule}
              </p>
            </div>
            <span
              className={cn(
                "type-caption font-semibold",
                commitment.doneToday ? "text-success" : "text-muted-foreground",
              )}
            >
              {commitment.doneToday ? "Done" : "Not yet"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export { TodayList };
