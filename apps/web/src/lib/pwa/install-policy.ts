import {
  INSTALL_COOLDOWN_DAYS,
  INSTALL_COOLDOWN_MS,
  INSTALL_DELAY_MS,
  INSTALL_DISMISSED_STORAGE_KEY,
  SUPPRESSED_INSTALL_PROMPT_ROUTES,
  getInstallCooldownTimestamp,
  isInstallCooldownActive,
  isInstallPromptEligible,
  isInstallPromptRouteSuppressed,
  type InstallPromptEligibilityParams,
} from "@myc/utils";

export {
  INSTALL_COOLDOWN_DAYS,
  INSTALL_COOLDOWN_MS,
  INSTALL_DELAY_MS,
  INSTALL_DISMISSED_STORAGE_KEY,
  SUPPRESSED_INSTALL_PROMPT_ROUTES,
  getInstallCooldownTimestamp,
  isInstallCooldownActive,
  isInstallPromptEligible,
  isInstallPromptRouteSuppressed,
  type InstallPromptEligibilityParams,
};

/**
 * Safely retrieves the stored dismissal expiration timestamp from localStorage.
 * Returns null if localStorage is unavailable, empty, or invalid.
 */
export function getStoredInstallDismissedUntil(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

/**
 * Safely persists the dismissal expiration timestamp into localStorage.
 * Handles storage quota or permission exceptions gracefully.
 */
export function setStoredInstallDismissedUntil(timestamp: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, String(timestamp));
  } catch {
    // Gracefully ignore storage quota / permissions errors
  }
}

/**
 * Safely clears any stored dismissal cooldown.
 */
export function clearStoredInstallDismissed(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(INSTALL_DISMISSED_STORAGE_KEY);
  } catch {
    // Gracefully ignore
  }
}
