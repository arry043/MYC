import type { Transition, Variants } from "motion/react";

/**
 * Motion tokens. Mirrors `--ease-soft` / `--ease-standard` in globals.css so CSS transitions and
 * Framer Motion animations feel the same.
 */
export const ease = {
  soft: [0.22, 1, 0.36, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;

export const duration = {
  fast: 0.15,
  base: 0.28,
  slow: 0.5,
  progress: 0.9,
} as const;

export const transition = {
  base: { duration: duration.base, ease: ease.soft },
  progress: { duration: duration.progress, ease: ease.soft },
  /** Shared-layout movement such as the active navigation indicator. */
  layout: { type: "spring", stiffness: 520, damping: 42, mass: 0.9 },
} satisfies Record<string, Transition>;

/**
 * Soft fade with a small rise, used for pages and cards. An optional delay arrives through the
 * motion `custom` prop; it is left out otherwise so a parent's stagger still applies.
 */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay?: number) => ({
    opacity: 1,
    y: 0,
    transition: delay ? { ...transition.base, delay } : transition.base,
  }),
};

export const stagger = (step = 0.045): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step } },
});
