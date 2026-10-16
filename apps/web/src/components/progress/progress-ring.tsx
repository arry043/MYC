"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";

import { transition } from "@/lib/motion";

type ProgressRingProps = {
  /** 0–100. */
  value: number;
  /** Accessible name, e.g. "Today's progress". */
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Centre content; defaults to the percentage. */
  children?: React.ReactNode;
};

/** Circular progress with a rounded cap that draws in once on mount. */
function ProgressRing({
  value,
  label,
  size = 120,
  strokeWidth = 10,
  className,
  children,
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-track"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-sky"
          // `initial` must match the server render; reduced motion only shortens the transition.
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={reduceMotion ? { duration: 0 } : transition.progress}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        {children ?? <span className="type-h2 tabular-nums">{Math.round(clamped)}%</span>}
      </div>
    </div>
  );
}

export { ProgressRing };
