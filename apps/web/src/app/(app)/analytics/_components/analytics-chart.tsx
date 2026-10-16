"use client";

import { cn } from "cn";
import { motion } from "motion/react";

import type { AnalyticsChartPoint } from "@myc/types";

import { ease } from "@/lib/motion";

interface AnalyticsChartProps {
  points: readonly AnalyticsChartPoint[];
  label: string;
  className?: string;
}

export function AnalyticsChart({ points, label, className }: AnalyticsChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-center type-caption text-muted-foreground">
        No data available for this period.
      </div>
    );
  }

  return (
    <figure className={cn("grid gap-2", className)}>
      <figcaption className="sr-only">{label}</figcaption>

      {/* Overflow container for mobile when many days (e.g. 31 days in a month) */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[320px]">
          {/* Chart Bars */}
          <ul className="flex h-40 items-end gap-1 border-b border-border pb-1 sm:gap-2">
            {points.map((point, index) => {
              const isUnscheduled = point.percentage === null;
              const val = isUnscheduled ? 0 : Math.min(100, Math.max(0, point.percentage!));
              const isFull = point.isConsistent === true;

              return (
                <li
                  key={point.date}
                  className="group/col relative flex h-full flex-1 items-end justify-center"
                >
                  <span className="sr-only">
                    {point.label} ({point.date}):{" "}
                    {isUnscheduled
                      ? "no commitments scheduled"
                      : `${val}% (${point.completed} of ${point.expected} completed)`}
                  </span>

                  {/* Accessible Hover Tooltip */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 type-caption font-semibold whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/col:opacity-100 group-focus-visible/col:opacity-100 max-sm:hidden"
                  >
                    <span className="block font-bold">{point.date}</span>
                    <span className="block text-[11px] font-normal text-background/90">
                      {isUnscheduled
                        ? "No scheduled commitments (N/A)"
                        : `${point.completed} / ${point.expected} done (${val}%)`}
                    </span>
                    {point.isConsistent && (
                      <span className="block text-[10px] text-emerald-300">✓ Consistent day</span>
                    )}
                  </span>

                  {/* Bar */}
                  {isUnscheduled ? (
                    <span
                      aria-hidden
                      className="block h-1.5 w-full max-w-5 rounded-t-[2px] border border-dashed border-border bg-border/50"
                    />
                  ) : (
                    <motion.span
                      aria-hidden
                      className={cn(
                        "block w-full max-w-5 origin-bottom rounded-t-[3px] transition-colors duration-200",
                        isFull
                          ? "bg-sky-4"
                          : val > 0
                            ? "bg-sky-2 group-hover/col:bg-sky-3"
                            : "bg-track",
                      )}
                      style={{ height: `${Math.max(val, 4)}%` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, ease: ease.soft, delay: index * 0.02 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {/* Labels */}
          <div aria-hidden className="flex gap-1 pt-1.5 sm:gap-2">
            {points.map((point) => (
              <span
                key={point.date}
                className="flex-1 truncate text-center type-caption text-[11px] text-muted-foreground"
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
