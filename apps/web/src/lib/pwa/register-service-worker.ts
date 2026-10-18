/**
 * Service Worker Registration & Controlled Update Controller
 */

export interface ServiceWorkerCallbacks {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: unknown) => void;
}

let isRefreshing = false;

/**
 * Registers the production service worker with scope '/' and sets up
 * lifecycle listeners to detect waiting updates safely.
 */
export async function registerServiceWorker(
  callbacks: ServiceWorkerCallbacks = {},
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  // Dev chunk URLs are not content-hashed, so the worker's Cache-First strategy would serve
  // stale JS after every edit (hydration mismatches). Remove any worker left from earlier runs.
  if (process.env.NODE_ENV !== "production") {
    await unregisterServiceWorkers();
    return null;
  }

  // Only register on secure contexts (HTTPS or localhost)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".localhost");

  if (window.location.protocol !== "https:" && !isLocalhost) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    if (callbacks.onSuccess) {
      callbacks.onSuccess(registration);
    }

    // 1. If an updated worker is already waiting in the background, trigger update notification
    if (registration.waiting && callbacks.onUpdateAvailable) {
      callbacks.onUpdateAvailable(registration);
    }

    // 2. Listen for newly installing workers that transition to 'waiting'
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          // If there is already an active controller, this new worker is an update
          if (navigator.serviceWorker.controller && callbacks.onUpdateAvailable) {
            callbacks.onUpdateAvailable(registration);
          }
        }
      });
    });

    // 3. Listen for controller changes with a duplicate-reload guard
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });

    return registration;
  } catch (error) {
    if (callbacks.onError) {
      callbacks.onError(error);
    } else {
      console.warn("[MYC SW] Service Worker registration failed:", error);
    }
    return null;
  }
}

/**
 * Unregisters every service worker for this origin and deletes MYC caches.
 */
async function unregisterServiceWorkers(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("myc-")).map((key) => caches.delete(key)),
      );
    }
  } catch (error) {
    console.warn("[MYC SW] Service Worker cleanup failed:", error);
  }
}

/**
 * Signals the waiting worker to activate immediately via SKIP_WAITING message.
 */
export function skipWaitingAndActivate(registration: ServiceWorkerRegistration): void {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
