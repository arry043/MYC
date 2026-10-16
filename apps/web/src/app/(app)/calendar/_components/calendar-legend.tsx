"use client";

import { cn } from "cn";

import type { ConsistencyIntensityLevel } from "@myc/types";
import { INTENSITY_LEVEL_CLASSES, INTENSITY_LEVEL_TEXT } from "@myc/utils";

interface CalendarLegendProps {
  className?: string;
}

const levels: ConsistencyIntensityLevel[] = [0, 1, 2, 3, 4];

export function CalendarLegend({ className }: CalendarLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 type-caption text-muted-foreground",
        className,
      )}
      role="region"
      aria-label="Consistency intensity legend"
    >
      <span>Less</span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {levels.map((lvl) => (
          <span
            key={lvl}
            title={INTENSITY_LEVEL_TEXT[lvl]}
            className={cn(
              "size-3.5 rounded-[4px] transition-transform hover:scale-110",
              INTENSITY_LEVEL_CLASSES[lvl],
            )}
          />
        ))}
      </div>
      <span>More</span>
      <span className="sr-only">
        Legend: level 0 is no commitments scheduled; level 1 is 0% completed; level 2 is 1% to 50%
        completed; level 3 is 51% to 99% completed; level 4 is 100% completed, a fully consistent
        day.
      </span>
    </div>
  );
}
