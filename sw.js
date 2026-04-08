/* =============================================================
   TRANSLUX — SERVICE WORKER (PWA)
   Strategy:
     • App Shell (HTML, CSS, JS, fonts) → Cache First
     • Translation API calls → Network First (fall back to cache)
     • All other requests → Network Only
============================================================= */

const CACHE_NAME    = "translux-v1";
const OFFLINE_URL   = "/index.html";

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  // Google Fonts (will be cached on first use via runtime caching below)
];

/* ----------------------------------------------------------
   INSTALL — Pre-cache the app shell
---------------------------------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately (don't wait for old SW to die)
  self.skipWaiting();
});

/* ----------------------------------------------------------
   ACTIVATE — Clean up old caches
---------------------------------------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

/* ----------------------------------------------------------
   FETCH — Routing logic
---------------------------------------------------------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // ── Translation / Spell APIs → Network First ──────────────
  const isApiCall = (
    url.hostname.includes("translate.googleapis.com") ||
    url.hostname.includes("mymemory.translated.net")  ||
    url.hostname.includes("libretranslate.de")         ||
    url.hostname.includes("languagetool.org")
  );

  if (isApiCall) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Google Fonts → Cache First (with network fallback) ────
  const isFont = (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  );

  if (isFont) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── App Shell (same origin) → Cache First ─────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, OFFLINE_URL));
    return;
  }

  // ── Everything else → Network Only ────────────────────────
  // (don't intercept; let the browser handle it)
});

/* ----------------------------------------------------------
   STRATEGIES
---------------------------------------------------------- */

/**
 * Cache First: return from cache if available,
 * else fetch from network, cache the response, then return it.
 * If both fail and a fallbackUrl is provided, return that.
 */
async function cacheFirst(request, fallbackUrl) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    // Return a minimal offline response
    return new Response(
      "Contenu hors-ligne non disponible.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}

/**
 * Network First: try the network first.
 * On success, update the cache and return the response.
 * On failure, try to return the cached version.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: "Hors-ligne — service de traduction non disponible." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
