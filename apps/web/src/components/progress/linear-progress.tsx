"use client";

import { Progress } from "@base-ui/react/progress";
import { cn } from "cn";
import { motion } from "motion/react";

import { transition } from "@/lib/motion";

type LinearProgressProps = {
  /** 0–100. */
  value: number;
  /** Accessible name; shown above the bar when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** Horizontal progress bar. The fill grows from the left once on mount. */
function LinearProgress({
  value,
  label,
  showLabel = false,
  size = "md",
  className,
}: LinearProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <Progress.Root
      value={clamped}
      aria-label={showLabel ? undefined : label}
      className={cn("grid gap-2", className)}
    >
      {showLabel && (
        <div className="flex items-baseline justify-between gap-3">
          <Progress.Label className="type-label">{label}</Progress.Label>
          <Progress.Value className="type-small font-semibold text-muted-foreground tabular-nums" />
        </div>
      )}
      <Progress.Track
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-track",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        {/* Animated with scaleX (not width) so it stays on the compositor. */}
        <motion.div
          className="absolute inset-0 origin-left rounded-full bg-sky"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: clamped / 100 }}
          transition={transition.progress}
        />
      </Progress.Track>
    </Progress.Root>
  );
}

export { LinearProgress };
