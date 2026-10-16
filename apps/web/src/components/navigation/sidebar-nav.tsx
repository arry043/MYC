"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, primaryNav, settingsNav, type NavItem } from "@/components/navigation/nav-items";
import { transition } from "@/lib/motion";

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav relative flex items-center rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
        // Tablet: stacked icon + small label. Desktop: icon and label in a row.
        "flex-col justify-center gap-1 px-1 py-2.5 type-caption font-semibold",
        "lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:type-small lg:font-semibold",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={transition.layout}
          aria-hidden
          className="absolute inset-0 rounded-xl border border-border/70 bg-card shadow-raised"
        />
      )}
      <span
        className={cn(
          "relative grid size-8 place-content-center rounded-lg transition-colors duration-200",
          active ? "bg-primary-soft text-primary-soft-foreground" : "group-hover/nav:bg-secondary",
        )}
      >
        <Icon aria-hidden className="size-[1.125rem]" strokeWidth={active ? 2.25 : 1.9} />
      </span>
      <span className="relative">{item.label}</span>
    </Link>
  );
}

/** Left navigation for tablet (icon rail) and desktop (full sidebar). */
function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
      {primaryNav.map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
      <div className="mt-auto pt-4">
        <SidebarLink item={settingsNav} active={isActive(pathname, settingsNav.href)} />
      </div>
    </nav>
  );
}

export { SidebarNav };
