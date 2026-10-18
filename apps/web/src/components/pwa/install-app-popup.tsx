"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  DownloadIcon,
  ShareIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";

import { usePwa } from "@/components/pwa/pwa-provider";
import { BrandMark } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

export function InstallAppPopup() {
  const { isInstallPromptOpen, canInstall, installPlatform, promptInstall, closeInstallPrompt } =
    usePwa();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  if (!isInstallPromptOpen) {
    return null;
  }

  const isIos = installPlatform === "ios";

  const handleInstallClick = async () => {
    if (isIos && !canInstall) {
      setShowIosInstructions(true);
      return;
    }

    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    closeInstallPrompt({ cooldown: true });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isInstalling) {
      handleDismiss();
    }
  };

  return (
    <DialogPrimitive.Root open={isInstallPromptOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Focused backdrop overlay: draws complete attention to centered modal */}
        <DialogPrimitive.Backdrop
          data-slot="install-popup-backdrop"
          className="fixed inset-0 z-50 bg-[oklch(0.20_0.03_250/0.45)] backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />

        {/* Centered modal on all screen sizes */}
        <DialogPrimitive.Popup
          data-slot="install-popup-content"
          aria-label="Install MYC as an App"
          className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border border-border/80 bg-card p-6 shadow-modal transition-[opacity,scale] duration-200 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:p-7"
        >
          {/* Top close button */}
          <DialogPrimitive.Close
            render={
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close install popup"
                className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="size-4" />
              </button>
            }
          />

          {/* Centered App Icon & Title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-xs">
              <BrandMark className="size-10" />
            </div>

            <div className="flex flex-col gap-1.5">
              <DialogPrimitive.Title className="type-h3 font-bold text-foreground">
                Install MYC as an App
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
                Make consistency easier. Add MYC to your device for a focused, distraction-free app
                experience.
              </DialogPrimitive.Description>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/35 p-3.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <ZapIcon className="size-4 shrink-0 text-primary" />
              <span>Instant launch directly from your desktop dock or home screen</span>
            </div>
            <div className="flex items-center gap-2.5">
              <SparklesIcon className="size-4 shrink-0 text-primary" />
              <span>Focused, dedicated window without browser tab distractions</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
              <span>Full consistency tracking with secure offline shell protection</span>
            </div>
          </div>

          {/* Body actions or iOS manual guidance */}
          {showIosInstructions ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <SmartphoneIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Tap the{" "}
                  <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                    <ShareIcon className="size-3.5" /> Share
                  </span>{" "}
                  button in Safari, then select{" "}
                  <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>.
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={handleDismiss}
                  className="w-full"
                >
                  Got it
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="w-full text-muted-foreground"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full font-semibold"
              >
                <DownloadIcon className="size-4" />
                {isInstalling ? "Opening prompt..." : "Install App"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                disabled={isInstalling}
                className="w-full text-muted-foreground"
              >
                Maybe Later
              </Button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
