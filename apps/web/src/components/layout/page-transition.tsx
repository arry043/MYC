"use client";

import { motion } from "motion/react";

import { riseIn } from "@/lib/motion";

/** Soft fade and rise each time a page is entered. Used from route `template.tsx` files. */
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={riseIn} className="grid gap-section">
      {children}
    </motion.div>
  );
}

export { PageTransition };
