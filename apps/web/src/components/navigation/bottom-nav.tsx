"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, primaryNav } from "@/components/navigation/nav-items";
import { transition } from "@/lib/motion";

/**
 * Phone navigation: the four main sections, thumb-reachable. Settings lives in the header so
 * each target stays wide enough to tap comfortably.
 */
function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] border-x border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_oklch(0.28_0.025_255/0.08)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-(--bottom-nav-height) max-w-md grid-cols-4 px-2">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl type-caption font-semibold transition-[color,scale] duration-200 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 active:scale-95",
                  active ? "text-primary-soft-foreground" : "text-muted-foreground",
                )}
              >
                <span className="relative grid h-8 w-14 place-content-center">
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      transition={transition.layout}
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-primary-soft"
                    />
                  )}
                  <Icon aria-hidden className="relative size-5" strokeWidth={active ? 2.25 : 1.9} />
                </span>
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { BottomNav };
