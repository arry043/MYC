/**
 * MYC Service Worker
 *
 * Implements a secure, minimal PWA lifecycle:
 * - Pre-caches public offline shell and brand icons
 * - Implements Cache-First for versioned static assets (/_next/static/*)
 * - Implements Network-First for navigation with /offline fallback
 * - NEVER caches authenticated HTML, user data, or Supabase API requests
 * - Supports controlled skip-waiting updates via postMessage
 */

const CACHE_VERSION = "myc-v1";
const STATIC_CACHE_NAME = `myc-static-${CACHE_VERSION}`;
const SHELL_CACHE_NAME = `myc-shell-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/offline",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

const SENSITIVE_SUBSTRINGS = [
  "supabase.co",
  "supabase.in",
  "/api/",
  "/auth/",
  "/verify-email",
  "/rest/v1/",
  "/auth/v1/",
  "/realtime/v1/",
];

// Installation: Precache the public offline fallback and essential icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        // Precache failures should not crash service worker registration
        console.warn("[MYC SW] Precache warning:", err);
      }),
  );
});

// Activation: Clean up any old caches from previous versions and claim clients
self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([STATIC_CACHE_NAME, SHELL_CACHE_NAME]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key.startsWith("myc-") && !allowedCaches.has(key)) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Message handling: Controlled updates and version checks
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: CACHE_VERSION });
    }
  }
});

// Fetch handling: Explicit security boundaries & caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // 2. Only handle http and https requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // 3. Absolute Security Rule: NEVER cache Supabase API, Auth, or sensitive calls
  const isSensitive =
    SENSITIVE_SUBSTRINGS.some((sub) => url.href.includes(sub)) ||
    request.headers.has("authorization") ||
    request.headers.has("apikey");

  if (isSensitive) {
    return; // Pass through to network with no caching
  }

  // 4. Navigation Requests: Network-First with /offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const shellCache = await caches.open(SHELL_CACHE_NAME);
        const fallback = await shellCache.match("/offline");
        if (fallback) {
          return fallback;
        }
        return new Response("You are offline. Please reconnect to continue using MYC.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
    );
    return;
  }

  // 5. Versioned static assets: Cache-First with Network Fallback
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/favicon.ico" ||
    /\.(?:woff2|woff|ttf|css|js|svg|png|jpg|jpeg|webp)$/i.test(url.pathname);

  // Exclude service worker file itself from static caching
  if (isStatic && url.pathname !== "/sw.js") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          // Only cache valid basic responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // Default: Pass to network
});
