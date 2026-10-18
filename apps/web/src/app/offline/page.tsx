import { WifiOffIcon } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

import { OfflineActions } from "./_components/offline-actions";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are currently offline. Connect to the internet to load your consistency data.",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Card className="flex max-w-lg flex-col items-center justify-center gap-6 p-8 shadow-raised sm:p-10">
        {/* Offline Icon */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
          <WifiOffIcon className="size-8" aria-hidden="true" />
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-2">
          <CardTitle className="type-h2">You&apos;re offline</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            MYC requires an active internet connection to load your commitments, record permanent
            completions, and compute accurate consistency streaks.
          </CardDescription>
        </div>

        {/* Safe notice */}
        <div className="w-full rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-left type-small text-muted-foreground">
          <p className="font-medium text-foreground">Data integrity protection</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            To guarantee your consistency history is permanent and authentic, completion records are
            never fabricated or queued unsafely while offline.
          </p>
        </div>

        {/* Action Controls */}
        <OfflineActions />
      </Card>
    </main>
  );
}
