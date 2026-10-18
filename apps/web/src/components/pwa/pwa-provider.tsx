"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

import {
  getInstallPlatform,
  isStandalone as checkIsStandalone,
  type InstallPlatform,
} from "@/lib/pwa/detect-standalone";
import {
  INSTALL_DELAY_MS,
  clearStoredInstallDismissed,
  getInstallCooldownTimestamp,
  getStoredInstallDismissedUntil,
  isInstallPromptEligible,
  setStoredInstallDismissedUntil,
} from "@/lib/pwa/install-policy";
import { registerServiceWorker, skipWaitingAndActivate } from "@/lib/pwa/register-service-worker";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextValue {
  isStandalone: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  installPlatform: InstallPlatform;
  isInstallDismissed: boolean;
  isInstallPromptOpen: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  updateApp: () => void;
  dismissUpdate: () => void;
  dismissInstall: () => void;
  openInstallPrompt: () => void;
  closeInstallPrompt: (options?: { cooldown?: boolean }) => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  mediaQuery.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mediaQuery.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function getStandaloneSnapshot(): boolean {
  return checkIsStandalone();
}

function getServerStandaloneSnapshot(): boolean {
  return false;
}

function subscribePlatform() {
  return () => {};
}

function getPlatformSnapshot(): InstallPlatform {
  return getInstallPlatform();
}

function getServerPlatformSnapshot(): InstallPlatform {
  return "unknown";
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getServerStandaloneSnapshot,
  );
  const installPlatform = useSyncExternalStore(
    subscribePlatform,
    getPlatformSnapshot,
    getServerPlatformSnapshot,
  );

  const [hasInstalledDuringSession, setHasInstalledDuringSession] = useState(false);
  const isInstalled = isStandalone || hasInstalledDuringSession;

  const [canInstall, setCanInstall] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isInstallDismissed, setIsInstallDismissed] = useState(false);
  const [isSessionDismissed, setIsSessionDismissed] = useState(false);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [isTimerElapsed, setIsTimerElapsed] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // 1. Initial smart timing delay: wait ~10 seconds after mount before eligibility consideration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimerElapsed(true);
    }, INSTALL_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  // 2. Continuous eligibility evaluation across routes and lifecycle signals
  useEffect(() => {
    if (!isTimerElapsed || isSessionDismissed || isInstallPromptOpen) {
      return;
    }

    const timer = setTimeout(() => {
      const eligible = isInstallPromptEligible({
        isStandalone,
        isInstalled,
        isSessionDismissed,
        dismissedUntil: getStoredInstallDismissedUntil(),
        currentTime: Date.now(),
        pathname: pathname ?? "",
        canInstall,
        installPlatform,
        isUpdateAvailable,
      });

      if (eligible) {
        setIsInstallPromptOpen(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isTimerElapsed,
    isSessionDismissed,
    isInstallPromptOpen,
    isStandalone,
    isInstalled,
    pathname,
    canInstall,
    installPlatform,
    isUpdateAvailable,
  ]);

  // 3. Browser event listeners and service worker registration
  useEffect(() => {
    // Listen for browser install prompt availability (Chromium, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setHasInstalledDuringSession(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsInstallPromptOpen(false);
      clearStoredInstallDismissed();
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register the production service worker
    registerServiceWorker({
      onUpdateAvailable: (reg) => {
        setSwRegistration(reg);
        setIsUpdateAvailable(true);
      },
    }).then((reg) => {
      if (reg) {
        setSwRegistration(reg);
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const closeInstallPrompt = (options?: { cooldown?: boolean }) => {
    setIsInstallPromptOpen(false);
    setIsSessionDismissed(true);
    setIsInstallDismissed(true);

    if (options?.cooldown !== false) {
      setStoredInstallDismissedUntil(getInstallCooldownTimestamp(Date.now()));
    }
  };

  const openInstallPrompt = () => {
    setIsInstallPromptOpen(true);
  };

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) {
      return "unavailable";
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setHasInstalledDuringSession(true);
        setCanInstall(false);
        setDeferredPrompt(null);
        clearStoredInstallDismissed();
        closeInstallPrompt({ cooldown: false });
        return "accepted";
      } else {
        closeInstallPrompt({ cooldown: true });
        return "dismissed";
      }
    } catch {
      return "unavailable";
    }
  };

  const updateApp = () => {
    if (swRegistration) {
      skipWaitingAndActivate(swRegistration);
    }
  };

  const dismissUpdate = () => {
    setIsUpdateAvailable(false);
  };

  const dismissInstall = () => {
    closeInstallPrompt({ cooldown: true });
  };

  return (
    <PwaContext.Provider
      value={{
        isStandalone,
        canInstall,
        isInstalled,
        isUpdateAvailable,
        installPlatform,
        isInstallDismissed,
        isInstallPromptOpen,
        promptInstall,
        updateApp,
        dismissUpdate,
        dismissInstall,
        openInstallPrompt,
        closeInstallPrompt,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error("usePwa must be used within a PwaProvider");
  }
  return context;
}
