"use client";

import { cn } from "cn";
import { motion } from "motion/react";

import { ease } from "@/lib/motion";

type Column = { label: string; value: number };

type ColumnChartProps = {
  data: readonly Column[];
  /** Accessible name, e.g. "Daily consistency, last 7 days". */
  label: string;
  /** Emphasises the last column (e.g. today / this week). */
  highlightLast?: boolean;
  className?: string;
};

/**
 * Single-series percentage columns. One hue, thin marks, a recessive baseline and a
 * hover value per column; each value is also exposed to assistive technology as text.
 */
function ColumnChart({ data, label, highlightLast = false, className }: ColumnChartProps) {
  return (
    <figure className={cn("grid gap-2", className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="flex h-36 items-end gap-2 border-b border-border sm:gap-3">
        {data.map((column, index) => {
          const value = Math.min(100, Math.max(0, column.value));
          const emphasised = highlightLast && index === data.length - 1;
          return (
            <li
              key={column.label}
              className="group/col relative flex h-full flex-1 items-end justify-center"
            >
              <span className="sr-only">
                {column.label}: {value}%
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 type-caption font-semibold text-background tabular-nums opacity-0 transition-opacity duration-150 group-hover/col:opacity-100"
              >
                {value}%
              </span>
              {/* The hit area is the whole column, wider than the bar itself. */}
              <motion.span
                aria-hidden
                className={cn(
                  "block w-full max-w-7 origin-bottom rounded-t-[4px] transition-colors duration-200",
                  emphasised ? "bg-sky-4" : "bg-sky-3 group-hover/col:bg-sky-4",
                )}
                style={{ height: `${Math.max(value, 2)}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: ease.soft, delay: index * 0.04 }}
              />
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="flex gap-2 sm:gap-3">
        {data.map((column, index) => (
          <span
            key={column.label}
            className={cn(
              "flex-1 text-center type-caption text-muted-foreground",
              highlightLast && index === data.length - 1 && "font-semibold text-foreground",
            )}
          >
            {column.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export { ColumnChart };
