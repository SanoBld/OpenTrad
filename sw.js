/* =============================================================
   OPENTRAD — SERVICE WORKER (PWA)
   Strategy:
     • App Shell (HTML, CSS, JS, fonts) → Cache First
     • Translation API calls → Network First (fall back to cache)
     • All other requests → Network Only
============================================================= */

const CACHE_NAME  = "opentrad-v2";
const OFFLINE_URL = "/OpenTrad/index.html";
const BASE        = "/OpenTrad";
const ORIGIN      = "https://sanobld.github.io";

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/OpenTrad/",
  "/OpenTrad/index.html",
  "/OpenTrad/style.css",
  "/OpenTrad/app.js",
  "/OpenTrad/manifest.json",
  "/OpenTrad/LogoC.png",
  // Google Fonts CSS (font binaries are cached at runtime via cacheFirst)
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap",
];

/* ----------------------------------------------------------
   INSTALL — Pre-cache the app shell
---------------------------------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[OpenTrad SW] Pre-caching app shell");
      // addAll fails if any URL errors — use individual puts for external URLs
      const localUrls  = PRECACHE_URLS.filter(u => !u.startsWith("http"));
      const remoteUrls = PRECACHE_URLS.filter(u => u.startsWith("http"));

      return cache.addAll(localUrls).then(() =>
        Promise.allSettled(
          remoteUrls.map(url =>
            fetch(url, { mode: "cors" })
              .then(res => { if (res.ok) cache.put(url, res); })
              .catch(() => { /* font CDN might fail offline — ok */ })
          )
        )
      );
    })
  );
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
            console.log("[OpenTrad SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

/* ----------------------------------------------------------
   FETCH — Routing logic
---------------------------------------------------------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

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

  // ── Google Fonts → Cache First (runtime caching) ──────────
  const isFont = (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  );

  if (isFont) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── App Shell (same origin) → Cache First ─────────────────
  if (url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(cacheFirst(request, OFFLINE_URL));
    return;
  }
});

/* ----------------------------------------------------------
   STRATEGIES
---------------------------------------------------------- */
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
    return new Response(
      "Contenu hors-ligne non disponible.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}

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
