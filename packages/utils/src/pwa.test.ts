import assert from "node:assert/strict";
import test from "node:test";

import {
  CACHE_VERSION,
  PRECACHE_URLS,
  SHELL_CACHE_NAME,
  STATIC_CACHE_NAME,
  getInstallCooldownTimestamp,
  isInstallCooldownActive,
  isInstallPromptEligible,
  isInstallPromptRouteSuppressed,
  isMutationMethod,
  isNavigationPwaRequest,
  isSensitivePwaRequest,
  isStaticPwaAsset,
  validateManifestData,
} from "./pwa.ts";

test("PWA cache versioning and precache URLs", () => {
  assert.equal(CACHE_VERSION, "myc-v1");
  assert.equal(STATIC_CACHE_NAME, "myc-static-myc-v1");
  assert.equal(SHELL_CACHE_NAME, "myc-shell-myc-v1");
  assert.ok(PRECACHE_URLS.includes("/offline"));
  assert.ok(PRECACHE_URLS.includes("/manifest.webmanifest"));
  assert.ok(PRECACHE_URLS.includes("/icons/icon-192.png"));
  assert.ok(PRECACHE_URLS.includes("/icons/icon-512.png"));
  assert.ok(PRECACHE_URLS.includes("/icons/icon-maskable-512.png"));
});

test("isSensitivePwaRequest identifies sensitive endpoints and credentials", () => {
  // Remote Supabase APIs
  assert.equal(
    isSensitivePwaRequest("https://nsayfmlholzfwyxbtdgy.supabase.co/rest/v1/daily_completions"),
    true,
  );
  assert.equal(
    isSensitivePwaRequest("https://nsayfmlholzfwyxbtdgy.supabase.co/auth/v1/user"),
    true,
  );

  // Local auth and API endpoints
  assert.equal(isSensitivePwaRequest("https://myc.local/api/dev/supabase"), true);
  assert.equal(isSensitivePwaRequest("/auth/callback"), true);
  assert.equal(isSensitivePwaRequest("/verify-email"), true);

  // Requests with Authorization or apikey headers
  assert.equal(
    isSensitivePwaRequest("https://myc.local/commitments", {
      authorization: "Bearer secret-token",
    }),
    true,
  );
  assert.equal(
    isSensitivePwaRequest("https://myc.local/commitments", {
      apikey: "anon-key",
    }),
    true,
  );

  // Public safe assets
  assert.equal(isSensitivePwaRequest("/_next/static/chunks/main.js"), false);
  assert.equal(isSensitivePwaRequest("/icons/icon-192.png"), false);
  assert.equal(isSensitivePwaRequest("/icon.svg"), false);
  assert.equal(isSensitivePwaRequest("/offline"), false);
});

test("isStaticPwaAsset identifies immutable static bundles and icons", () => {
  assert.equal(isStaticPwaAsset("/_next/static/chunks/app.js"), true);
  assert.equal(isStaticPwaAsset("/_next/static/css/app.css"), true);
  assert.equal(isStaticPwaAsset("/icons/icon-192.png"), true);
  assert.equal(isStaticPwaAsset("/icons/icon-maskable-512.png"), true);
  assert.equal(isStaticPwaAsset("/icon.svg"), true);
  assert.equal(isStaticPwaAsset("/favicon.ico"), true);

  // Service worker must NOT be cached as a static asset
  assert.equal(isStaticPwaAsset("/sw.js"), false);

  // Dynamic routes
  assert.equal(isStaticPwaAsset("/dashboard"), false);
  assert.equal(isStaticPwaAsset("/commitments"), false);
  assert.equal(isStaticPwaAsset("/api/test"), false);
});

test("isNavigationPwaRequest detects HTML document navigations", () => {
  assert.equal(isNavigationPwaRequest("navigate"), true);
  assert.equal(isNavigationPwaRequest(undefined, "text/html,application/xhtml+xml"), true);
  assert.equal(isNavigationPwaRequest(undefined, "application/json"), false);
  assert.equal(isNavigationPwaRequest(undefined, "image/png"), false);
});

test("isMutationMethod detects state-modifying HTTP methods", () => {
  assert.equal(isMutationMethod("POST"), true);
  assert.equal(isMutationMethod("PUT"), true);
  assert.equal(isMutationMethod("PATCH"), true);
  assert.equal(isMutationMethod("DELETE"), true);
  assert.equal(isMutationMethod("post"), true);

  assert.equal(isMutationMethod("GET"), false);
  assert.equal(isMutationMethod("HEAD"), false);
  assert.equal(isMutationMethod("OPTIONS"), false);
});

test("validateManifestData validates required PWA manifest schema", () => {
  const validManifest = {
    name: "MYC — Make Yourself Consistent",
    short_name: "MYC",
    start_url: "/?source=pwa",
    display: "standalone",
    background_color: "#fdfaf4",
    theme_color: "#fdfaf4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  const res = validateManifestData(validManifest);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);

  const invalidManifest = {
    name: "Incomplete",
    display: "browser",
  };

  const failRes = validateManifestData(invalidManifest);
  assert.equal(failRes.valid, false);
  assert.ok(failRes.errors.length >= 3);
});

test("isInstallPromptRouteSuppressed identifies critical routes", () => {
  assert.equal(isInstallPromptRouteSuppressed("/onboarding"), true);
  assert.equal(isInstallPromptRouteSuppressed("/onboarding/step2"), true);
  assert.equal(isInstallPromptRouteSuppressed("/offline"), true);
  assert.equal(isInstallPromptRouteSuppressed("/verify-email"), true);
  assert.equal(isInstallPromptRouteSuppressed("/reset-password"), true);

  assert.equal(isInstallPromptRouteSuppressed("/dashboard"), false);
  assert.equal(isInstallPromptRouteSuppressed("/commitments"), false);
  assert.equal(isInstallPromptRouteSuppressed("/calendar"), false);
  assert.equal(isInstallPromptRouteSuppressed("/analytics"), false);
  assert.equal(isInstallPromptRouteSuppressed("/settings"), false);
  assert.equal(isInstallPromptRouteSuppressed("/login"), false);
});

test("isInstallCooldownActive and getInstallCooldownTimestamp", () => {
  const now = 1700000000000;
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;

  assert.equal(getInstallCooldownTimestamp(now), sevenDaysLater);
  assert.equal(isInstallCooldownActive(sevenDaysLater, now), true);
  assert.equal(isInstallCooldownActive(now - 1000, now), false);
  assert.equal(isInstallCooldownActive(now, now), false);
  assert.equal(isInstallCooldownActive(null, now), false);
  assert.equal(isInstallCooldownActive(undefined, now), false);
  assert.equal(isInstallCooldownActive(Number.NaN, now), false);
});

test("isInstallPromptEligible comprehensively covers all eligibility scenarios", () => {
  const now = 1700000000000;

  const baseEligible = {
    isStandalone: false,
    isInstalled: false,
    isSessionDismissed: false,
    dismissedUntil: null,
    currentTime: now,
    pathname: "/dashboard",
    canInstall: true,
    installPlatform: "desktop",
    isUpdateAvailable: false,
  };

  // 1. Eligible baseline
  assert.equal(isInstallPromptEligible(baseEligible), true);

  // 2. Standalone app -> NEVER show
  assert.equal(isInstallPromptEligible({ ...baseEligible, isStandalone: true }), false);

  // 3. Installed app -> NEVER show
  assert.equal(isInstallPromptEligible({ ...baseEligible, isInstalled: true }), false);

  // 4. Dismissed in current session -> NEVER show
  assert.equal(isInstallPromptEligible({ ...baseEligible, isSessionDismissed: true }), false);

  // 5. Active cooldown -> NEVER show
  assert.equal(isInstallPromptEligible({ ...baseEligible, dismissedUntil: now + 86400000 }), false);

  // 6. Expired cooldown -> SHOW
  assert.equal(isInstallPromptEligible({ ...baseEligible, dismissedUntil: now - 86400000 }), true);

  // 7. Update waiting -> suppress install prompt
  assert.equal(isInstallPromptEligible({ ...baseEligible, isUpdateAvailable: true }), false);

  // 8. Suppressed route (e.g. /onboarding) -> suppress
  assert.equal(isInstallPromptEligible({ ...baseEligible, pathname: "/onboarding" }), false);
  assert.equal(isInstallPromptEligible({ ...baseEligible, pathname: "/offline" }), false);

  // 9. Desktop browser without programmatic install (e.g. Firefox) -> suppress automatic popup
  assert.equal(isInstallPromptEligible({ ...baseEligible, canInstall: false }), false);

  // 10. iOS Safari browser without programmatic prompt -> SHOW (manual instructions available)
  assert.equal(
    isInstallPromptEligible({
      ...baseEligible,
      canInstall: false,
      installPlatform: "ios",
    }),
    true,
  );

  // 11. iOS in standalone mode -> NEVER show
  assert.equal(
    isInstallPromptEligible({
      ...baseEligible,
      canInstall: false,
      installPlatform: "ios",
      isStandalone: true,
    }),
    false,
  );
});
