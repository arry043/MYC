"use client";

import { RefreshCwIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { usePwa } from "@/components/pwa/pwa-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UpdateNotice() {
  const { isUpdateAvailable, updateApp, dismissUpdate } = usePwa();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isUpdateAvailable) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    updateApp();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 max-w-sm animate-in duration-200 fade-in slide-in-from-bottom-3 max-sm:right-4 max-sm:left-4"
    >
      <Card className="flex flex-col gap-3 border-primary/30 bg-card p-4 shadow-raised">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 grid size-7 shrink-0 place-content-center rounded-lg bg-primary-soft text-primary">
              <SparklesIcon className="size-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="type-small font-bold text-foreground">Update available</p>
              <p className="type-caption text-muted-foreground">
                A new version of MYC is available with improvements and fixes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Dismiss update notification"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={dismissUpdate}
            disabled={isUpdating}
          >
            Later
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            <RefreshCwIcon className={`size-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            {isUpdating ? "Updating..." : "Update now"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
