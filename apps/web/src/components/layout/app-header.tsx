"use client";

import { usePathname } from "next/navigation";

import { isActive, primaryNav, profileNav, settingsNav } from "@/components/navigation/nav-items";
import { UserMenu } from "@/components/navigation/user-menu";
import { Brand } from "@/components/shared/brand";

/**
 * Top bar. Shows brand on phones and current section path on tablet/desktop,
 * with the UserMenu profile dropdown on the right.
 */
function AppHeader() {
  const pathname = usePathname();
  const current = [...primaryNav, profileNav, settingsNav].find((item) =>
    isActive(pathname, item.href),
  );

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) items-center gap-3 rounded-b-[1.75rem] border-x border-b border-border/80 bg-card/95 px-page shadow-raised backdrop-blur-xl md:rounded-none md:border-x-0 md:border-b md:border-transparent md:bg-background/80 md:shadow-none">
      <Brand className="md:hidden" />
      {current && (
        <p className="hidden type-small text-muted-foreground md:block">
          MYC <span className="px-1.5 text-border">/</span>
          <span className="font-semibold text-foreground">{current.label}</span>
        </p>
      )}
      <div className="ml-auto flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}

export { AppHeader };
