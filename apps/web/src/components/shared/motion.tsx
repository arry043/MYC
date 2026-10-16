"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";

import { riseIn, stagger } from "@/lib/motion";

/**
 * `reducedMotion="user"` drops transform animations (movement, scale) when the OS asks for
 * reduced motion, keeping only opacity fades.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its content into place once, on mount. */
export function FadeIn({ delay, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={riseIn} custom={delay} {...props} />
  );
}

/** Container whose `StaggerItem` children enter one after another. */
export function Stagger({ step, ...props }: HTMLMotionProps<"div"> & { step?: number }) {
  return <motion.div initial="hidden" animate="visible" variants={stagger(step)} {...props} />;
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={riseIn} {...props} />;
}
