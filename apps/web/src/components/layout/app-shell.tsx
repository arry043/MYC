import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { Brand } from "@/components/shared/brand";

/**
 * Signed-in application frame.
 * - Phone (< 768px): compact header, single column, bottom navigation.
 * - Tablet (768–1023px): narrow icon rail with labels.
 * - Desktop (≥ 1024px): full sidebar and wider content.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 md:grid md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-card px-4 py-2 type-small font-semibold shadow-floating transition-[translate] focus-visible:translate-y-0 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/60 px-2.5 pb-5 md:flex lg:px-4">
        <div className="flex h-(--header-height) shrink-0 items-center justify-center lg:justify-start lg:px-2">
          <Brand compact className="lg:hidden" />
          <Brand className="hidden lg:inline-flex" />
        </div>
        <div className="flex flex-1 flex-col pt-4">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-page pt-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+2rem)] outline-none md:pt-2 md:pb-12"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export { AppShell };
