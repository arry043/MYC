/**
 * Pure PWA utilities, security rules, and manifest validation.
 */

export const CACHE_VERSION = "myc-v1";
export const STATIC_CACHE_NAME = `myc-static-${CACHE_VERSION}`;
export const SHELL_CACHE_NAME = `myc-shell-${CACHE_VERSION}`;

export const PRECACHE_URLS = [
  "/offline",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
] as const;

const SENSITIVE_PATH_PREFIXES = [
  "/api/",
  "/auth/",
  "/verify-email",
  "/rest/v1/",
  "/auth/v1/",
  "/realtime/v1/",
  "/storage/v1/",
];

const SENSITIVE_HOST_SUBSTRINGS = ["supabase.co", "supabase.in"];

/**
 * Determines whether a request targets sensitive or private endpoints.
 * Sensitive requests must NEVER be cached in Cache Storage.
 */
export function isSensitivePwaRequest(
  urlStr: string,
  headers?: Headers | Record<string, string> | null,
): boolean {
  try {
    const url = new URL(urlStr, "https://myc.local");

    if (SENSITIVE_HOST_SUBSTRINGS.some((sub) => url.hostname.includes(sub))) {
      return true;
    }

    if (SENSITIVE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return true;
    }

    if (headers) {
      if (typeof (headers as Headers).get === "function") {
        const h = headers as Headers;
        if (h.get("authorization") || h.get("apikey")) {
          return true;
        }
      } else {
        const obj = headers as Record<string, string>;
        const lowerKeys = Object.keys(obj).map((k) => k.toLowerCase());
        if (lowerKeys.includes("authorization") || lowerKeys.includes("apikey")) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return true; // Fail closed
  }
}

/**
 * Determines whether a request is for an immutable or versioned static asset.
 */
export function isStaticPwaAsset(urlStr: string): boolean {
  try {
    const url = new URL(urlStr, "https://myc.local");
    const path = url.pathname;

    // Never cache service worker script as a static asset
    if (path === "/sw.js" || path.endsWith("/sw.js")) {
      return false;
    }

    if (path.startsWith("/_next/static/")) {
      return true;
    }

    if (path.startsWith("/icons/") || path === "/icon.svg" || path === "/favicon.ico") {
      return true;
    }

    if (/\.(?:woff2|woff|ttf|eot|css|js|svg|png|jpg|jpeg|webp|ico)$/i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Determines whether a request is a top-level HTML navigation request.
 */
export function isNavigationPwaRequest(mode?: string, acceptHeader?: string | null): boolean {
  if (mode === "navigate") {
    return true;
  }

  if (acceptHeader && acceptHeader.includes("text/html")) {
    return true;
  }

  return false;
}

/**
 * Determines whether an HTTP method mutates state.
 */
export function isMutationMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/**
 * Validates web app manifest required fields and icon definitions.
 */
export function validateManifestData(manifest: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("Missing or invalid manifest name");
  }

  if (!manifest.short_name || typeof manifest.short_name !== "string") {
    errors.push("Missing or invalid manifest short_name");
  }

  if (!manifest.start_url || typeof manifest.start_url !== "string") {
    errors.push("Missing or invalid manifest start_url");
  }

  if (manifest.display !== "standalone") {
    errors.push("Manifest display must be 'standalone'");
  }

  if (!manifest.background_color || typeof manifest.background_color !== "string") {
    errors.push("Missing or invalid manifest background_color");
  }

  if (!manifest.theme_color || typeof manifest.theme_color !== "string") {
    errors.push("Missing or invalid manifest theme_color");
  }

  const icons = manifest.icons as Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;

  if (!Array.isArray(icons) || icons.length === 0) {
    errors.push("Manifest must declare icons");
  } else {
    const has192Any = icons.some(
      (i) => i.sizes === "192x192" && (!i.purpose || i.purpose === "any"),
    );
    const has512Any = icons.some(
      (i) => i.sizes === "512x512" && (!i.purpose || i.purpose === "any"),
    );
    const hasMaskable = icons.some((i) => i.purpose === "maskable");

    if (!has192Any) errors.push("Missing 192x192 standard icon");
    if (!has512Any) errors.push("Missing 512x512 standard icon");
    if (!hasMaskable) errors.push("Missing maskable icon for Android support");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Installation prompt policy constants.
 */
export const INSTALL_COOLDOWN_DAYS = 7;
export const INSTALL_COOLDOWN_MS = INSTALL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const INSTALL_DELAY_MS = 10000; // 10 seconds smart timing
export const INSTALL_DISMISSED_STORAGE_KEY = "myc_pwa_install_dismissed_until";

/**
 * Routes where the automatic install popup must be suppressed to avoid
 * interrupting critical onboarding, verification, or offline states.
 */
export const SUPPRESSED_INSTALL_PROMPT_ROUTES = [
  "/onboarding",
  "/offline",
  "/verify-email",
  "/reset-password",
] as const;

/**
 * Determines whether the current route suppresses automatic installation prompts.
 */
export function isInstallPromptRouteSuppressed(pathname: string): boolean {
  if (!pathname) return false;
  return SUPPRESSED_INSTALL_PROMPT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Checks whether an installation prompt dismissal cooldown is currently active.
 */
export function isInstallCooldownActive(
  dismissedUntil: number | null | undefined,
  now: number,
): boolean {
  if (typeof dismissedUntil !== "number" || Number.isNaN(dismissedUntil)) {
    return false;
  }
  return dismissedUntil > now;
}

/**
 * Calculates the future timestamp when a dismissal cooldown expires.
 */
export function getInstallCooldownTimestamp(
  now: number,
  cooldownDays: number = INSTALL_COOLDOWN_DAYS,
): number {
  return now + cooldownDays * 24 * 60 * 60 * 1000;
}

export interface InstallPromptEligibilityParams {
  isStandalone: boolean;
  isInstalled: boolean;
  isSessionDismissed: boolean;
  dismissedUntil?: number | null;
  currentTime: number;
  pathname?: string;
  canInstall: boolean;
  installPlatform: string;
  isUpdateAvailable?: boolean;
}

/**
 * Evaluates whether an intelligent install popup should be shown to the user.
 */
export function isInstallPromptEligible(params: InstallPromptEligibilityParams): boolean {
  // 1. Never show if already running in standalone or installed
  if (params.isStandalone || params.isInstalled) {
    return false;
  }

  // 2. Never show if dismissed in the current session
  if (params.isSessionDismissed) {
    return false;
  }

  // 3. Never show if within the dismissal cooldown period
  if (isInstallCooldownActive(params.dismissedUntil, params.currentTime)) {
    return false;
  }

  // 4. Never show if an app update is waiting (prioritize update notification)
  if (params.isUpdateAvailable) {
    return false;
  }

  // 5. Suppress on critical or sensitive routes
  if (params.pathname && isInstallPromptRouteSuppressed(params.pathname)) {
    return false;
  }

  // 6. Must have supported installation path:
  // - Either programmatic install prompt available (canInstall)
  // - Or iOS Safari manual "Add to Home Screen" instructions
  // Suppress automatic prompt on desktop browsers without installation support
  const hasProgrammaticInstall = params.canInstall;
  const hasIosManualInstall = params.installPlatform === "ios";

  if (!hasProgrammaticInstall && !hasIosManualInstall) {
    return false;
  }

  return true;
}
