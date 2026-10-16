import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/shared/brand";
import { FadeIn } from "@/components/shared/motion";
import { APP_NAME } from "@/lib/app";

export const metadata: Metadata = {
  title: {
    template: `%s · ${APP_NAME}`,
    default: APP_NAME,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-page py-10 selection:bg-primary-soft selection:text-foreground">
      {/* Subtle top atmospheric radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,var(--atmosphere)_0%,transparent_70%)]"
      />

      <header className="relative z-10 flex flex-col items-center gap-2">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          <BrandMark className="size-9 transition-transform duration-200 group-hover:scale-105" />
          <span className="type-h3 font-bold tracking-tight text-foreground">{APP_NAME}</span>
        </Link>
      </header>

      <main className="relative z-10 my-auto flex w-full max-w-[26rem] flex-col py-8">
        <FadeIn>{children}</FadeIn>
      </main>

      <footer className="relative z-10 text-center">
        <p className="type-small text-muted-foreground/80">
          Make Yourself Consistent · Built for quiet progress
        </p>
      </footer>
    </div>
  );
}
