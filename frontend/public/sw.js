// GENERATED FILE — do not edit. Source: src/lib/pwa/shell.mjs, generator: scripts/generate-sw.mjs
"use strict";

const SHELL_ROUTES = [
  "/",
  "/tentang-kami",
  "/kegiatan",
  "/pelayanan",
  "/media",
  "/kontak",
  "/offline"
];
const SHELL_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-icon-180.png",
  "/icon.svg"
];
const FORBIDDEN_PREFIXES = [
  "/staff",
  "/api",
  "/auth",
  "/sekolah-sabat",
  "/pelajari-alkitab"
];
const OFFLINE_URL = "/offline";
// P5-002: a stored page is stamped as it is fetched, so the page can say how old its copy is.
const CACHED_AT_HEADER = "X-Rinegetan-Cached-At";
const CACHE_STATUS_MESSAGE = "CACHE_STATUS";

function isForbiddenPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return true;
  return FORBIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
function isShellRoute(pathname) {
  return SHELL_ROUTES.includes(pathname);
}
function strategyFor(request, origin) {
  const method = request?.method ?? "GET";
  if (method !== "GET") return "bypass";

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }
  if (url.origin !== origin) return "bypass";
  if (isForbiddenPath(url.pathname)) return "bypass";
  if (url.pathname.startsWith("/_next/static/")) return "cache-first";
  if (SHELL_ASSETS.includes(url.pathname)) return "cache-first";
  // Only whole-page navigations are cached; a fetch() to the same URL is not a shell request.
  if (request.mode === "navigate" && isShellRoute(url.pathname)) return "network-first";
  return "bypass";
}
function cacheName(buildId) {
  if (typeof buildId !== "string" || !/^[0-9a-z]{1,40}$/i.test(buildId)) {
    throw new Error(`Invalid build id: ${String(buildId)}`);
  }
  return `rinegetan-shell-${buildId}`;
}

// The build id arrives in the registration URL (?v=<id>), so one worker script serves every
// build while each build gets its own cache namespace.
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = cacheName(BUILD_ID);
const SHELL = [...SHELL_ROUTES, ...SHELL_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // The offline page is the only entry that cannot be missing: without it a failed navigation
    // has nothing to show. A failure here rejects the install on purpose, so the browser keeps the
    // previous shell and retries on the next visit instead of adopting a shell that cannot serve
    // its own fallback.
    const offlineResponse = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
    if (!offlineResponse.ok) throw new Error("Offline page unavailable: " + offlineResponse.status);
    await cache.put(OFFLINE_URL, offlineResponse);

    // The rest is best effort: one missing page must not abort the install, or a single 404 would
    // leave the site with no offline shell at all.
    await Promise.all(SHELL.filter((url) => url !== OFFLINE_URL).map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) await cache.put(url, response);
      } catch {
        // Offline during install: keep whatever was fetched; the next visit retries.
      }
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Every cache that is not this build's name is from an older build and is deleted whole.
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data.type === "RESET_CACHE") {
    // Recovery path: drop every cache and let the next request rebuild from the network.
    event.waitUntil(caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))));
  }
  if (data.type === CACHE_STATUS_MESSAGE) {
    // P5-002: how old is the copy of this path? Answered from the stamp taken when it was stored,
    // so the page can say "saved 3 hours ago" instead of guessing from navigator.onLine.
    event.waitUntil((async () => {
      const port = event.ports && event.ports[0];
      if (!port) return;
      let cachedAt = null;
      try {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(data.path);
        cachedAt = cached ? cached.headers.get(CACHED_AT_HEADER) : null;
      } catch {
        cachedAt = null;
      }
      port.postMessage({ path: data.path, cachedAt });
    })());
  }
});

// Stamps a response before it is stored. The stored copy carries the time; the response handed to
// the page is the untouched original, so nothing about the page itself changes.
const stamped = (response) => {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, new Date().toISOString());
  return response.blob().then((body) => new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
};

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request, self.location.origin);
  if (strategy === "bypass") return;

  if (strategy === "cache-first") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  // network-first: a published change must be visible on the next load, not the next release.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      // Only the stored copy is stamped; the page receives the original response.
      if (response.ok) await cache.put(event.request, await stamped(response.clone()));
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
      // Last resort: the install guarantees /offline, but a cache cleared mid-session must still
      // produce a readable page rather than the browser's own network error.
      return new Response(
        "<!doctype html><html lang=\"id\"><meta charset=\"utf-8\"><title>Anda sedang offline</title>" +
        "<body style=\"font-family:system-ui;padding:2rem;color:#0A2540\">" +
        "<h1>Anda sedang offline</h1><p>Sambungkan internet untuk membuka halaman ini.</p>" +
        "<p><a href=\"/\">Kembali ke beranda</a></p></body></html>",
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
  })());
});
