/* PaperGen service worker.
 *
 * Deliberately small. A teacher's paper lives in Supabase and every AI call
 * needs the network, so there is no useful "offline mode" to fake — caching
 * pages would mostly serve stale ones. What it does:
 *
 *   1. Makes the app installable (a fetch handler is required).
 *   2. Serves a real offline page instead of Chrome's dinosaur when a
 *      navigation fails, which on Indian mobile data happens often.
 *   3. Caches the icons and the offline page itself, nothing else.
 *
 * Anything dynamic — pages, API calls, Supabase — goes straight to the network.
 */

// v2 drops the precached "/offline" Next route: only literal paths in PRECACHE
// are served from the cache, so that page came back without its stylesheet.
const VERSION = "v2";
const SHELL = `papergen-shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // Individual failures must not abort the install, or a single 404 leaves
      // the app permanently uninstallable.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch anything that changes data or is not ours.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, offline page as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Precached static assets: cache first, since they are versioned by name.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((r) => r ?? fetch(request)));
  }
});
