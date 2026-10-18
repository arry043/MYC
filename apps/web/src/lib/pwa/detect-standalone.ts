/**
 * Utilities for detecting standalone PWA mode and platform installation capabilities.
 */

export type InstallPlatform = "android" | "ios" | "desktop" | "unknown";

/**
 * Checks whether the current window is executing inside standalone PWA mode.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Standard display-mode check (Chromium, Firefox, Safari desktop)
  const isDisplayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isDisplayStandalone) {
    return true;
  }

  // Fullscreen and minimal-ui display modes
  if (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  ) {
    return true;
  }

  // iOS Safari standalone flag
  const nav = window.navigator as unknown as { standalone?: boolean };
  if (nav && typeof nav.standalone === "boolean" && nav.standalone) {
    return true;
  }

  // Android Trusted Web Activity referrer check
  if (typeof document !== "undefined" && document.referrer.includes("android-app://")) {
    return true;
  }

  // URL search parameter set by start_url (?source=pwa)
  if (window.location.search.includes("source=pwa")) {
    return true;
  }

  return false;
}

/**
 * Detects the client platform to render tailored install instructions
 * when programmatic installation prompt is not supported (e.g. iOS Safari).
 */
export function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  if (/android/.test(ua)) {
    return "android";
  }

  if (/windows|macintosh|linux|cros/.test(ua)) {
    return "desktop";
  }

  return "unknown";
}
