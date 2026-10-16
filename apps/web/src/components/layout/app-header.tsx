"use client";

import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, primaryNav, settingsNav } from "@/components/navigation/nav-items";
import { UserMenu } from "@/components/navigation/user-menu";
import { Brand } from "@/components/shared/brand";
import { buttonVariants } from "@/components/ui/button";

/**
 * Top bar. Phones: brand, settings and account. Tablet and up the brand sits in the sidebar,
 * so the bar shows where you are instead.
 */
function AppHeader() {
  const pathname = usePathname();
  const current = [...primaryNav, settingsNav].find((item) => isActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) items-center gap-3 border-b border-border/60 bg-background/80 px-page backdrop-blur-xl md:border-transparent">
      <Brand className="md:hidden" />
      {current && (
        <p className="hidden type-small text-muted-foreground md:block">
          MYC <span className="px-1.5 text-border">/</span>
          <span className="font-semibold text-foreground">{current.label}</span>
        </p>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={settingsNav.href}
          aria-label="Settings"
          aria-current={isActive(pathname, settingsNav.href) ? "page" : undefined}
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "rounded-full aria-[current=page]:text-primary md:hidden",
          })}
        >
          <SettingsIcon aria-hidden className="size-5" />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}

export { AppHeader };
