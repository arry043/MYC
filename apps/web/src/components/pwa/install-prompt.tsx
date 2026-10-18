"use client";

import {
  CheckCircle2Icon,
  DownloadIcon,
  LaptopIcon,
  ShareIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useState } from "react";

import { usePwa } from "@/components/pwa/pwa-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const { isInstalled, canInstall, installPlatform, promptInstall } = usePwa();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const result = await promptInstall();
    setIsInstalling(false);

    if (result === "accepted") {
      toast({
        title: "MYC Installed",
        description:
          "You can now launch MYC directly from your home screen or application launcher.",
        tone: "success",
      });
    } else if (result === "dismissed") {
      toast({
        title: "Installation postponed",
        description: "You can install MYC anytime from Settings.",
      });
    }
  };

  // State 1: Already installed or running in standalone mode
  if (isInstalled) {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 ${className ?? ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-content-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div>
              <p className="type-small font-bold text-foreground">Installed Application</p>
              <p className="type-caption text-muted-foreground">
                MYC is installed and running with a dedicated app window.
              </p>
            </div>
          </div>
          <Badge tone="success">Installed</Badge>
        </div>
      </div>
    );
  }

  // State 2: Programmatic installation prompt is available (Chromium, Edge, Android Chrome)
  if (canInstall) {
    return (
      <div
        className={`flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 ${className ?? ""}`}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-xl bg-primary-soft text-primary">
              <DownloadIcon className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="type-small font-bold text-foreground">Install MYC as an App</p>
              <p className="type-caption text-muted-foreground">
                Get fast, distraction-free access from your desktop dock, taskbar, or home screen.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="mt-2 sm:mt-0"
          >
            <DownloadIcon className="size-4" />
            {isInstalling ? "Opening prompt..." : "Install now"}
          </Button>
        </div>
      </div>
    );
  }

  // State 3: iOS Safari (Manual "Add to Home Screen" instructions)
  if (installPlatform === "ios") {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 ${className ?? ""}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-xl bg-primary-soft text-primary">
            <SmartphoneIcon className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="type-small font-bold text-foreground">Install on iPhone or iPad</p>
            <p className="type-caption leading-relaxed text-muted-foreground">
              To install MYC on iOS, open this page in Safari, tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                <ShareIcon className="size-3.5" /> Share
              </span>{" "}
              button in the toolbar, and select{" "}
              <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Other browsers / Desktop manual instructions
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-xl bg-secondary text-muted-foreground">
          <LaptopIcon className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="type-small font-bold text-foreground">Browser App Installation</p>
          <p className="type-caption leading-relaxed text-muted-foreground">
            You can install MYC using your browser&apos;s menu (e.g. Chrome, Edge, or Brave: select{" "}
            <strong className="text-foreground">&quot;Install MYC&quot;</strong> or{" "}
            <strong className="text-foreground">
              &quot;Save and share → Install page as app&quot;
            </strong>
            ).
          </p>
        </div>
      </div>
    </div>
  );
}
