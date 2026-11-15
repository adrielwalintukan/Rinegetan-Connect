// Generates public/sw.js from src/lib/pwa/shell.mjs so the shipped worker cannot drift from the
// policy the tests exercise. Run with: node scripts/generate-sw.mjs
// The output is a classic (non-module) worker with the policy inlined; a worker that imported
// ESM at runtime would need a bundler step and a module MIME type, neither of which this needs.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FORBIDDEN_PREFIXES,
  SHELL_ASSETS,
  SHELL_ROUTES,
  cacheName,
  isForbiddenPath,
  isShellRoute,
  strategyFor,
} from "../src/lib/pwa/shell.mjs";

const list = (values) => values.map((value) => JSON.stringify(value)).join(",\n  ");

// The helpers are serialised with Function.prototype.toString so the worker runs the same logic
// the tests assert on. If a helper ever stops being self-contained this throws at generation
// time instead of shipping a worker that silently behaves differently.
const serialise = (fn) => {
  const source = fn.toString();
  if (/\bimport\b|\brequire\(/.test(source)) {
    throw new Error(`${fn.name} must stay self-contained to be inlined into the worker`);
  }
  return source;
};

const worker = `// GENERATED FILE — do not edit. Source: src/lib/pwa/shell.mjs, generator: scripts/generate-sw.mjs
"use strict";

const SHELL_ROUTES = [
  ${list(SHELL_ROUTES)}
];
const SHELL_ASSETS = [
  ${list(SHELL_ASSETS)}
];
const FORBIDDEN_PREFIXES = [
  ${list(FORBIDDEN_PREFIXES)}
];
const OFFLINE_URL = "/offline";

${serialise(isForbiddenPath)}
${serialise(isShellRoute)}
${serialise(strategyFor)}
${serialise(cacheName)}

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
});

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
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
      // Last resort: the install guarantees /offline, but a cache cleared mid-session must still
      // produce a readable page rather than the browser's own network error.
      return new Response(
        "<!doctype html><html lang=\\"id\\"><meta charset=\\"utf-8\\"><title>Anda sedang offline</title>" +
        "<body style=\\"font-family:system-ui;padding:2rem;color:#0A2540\\">" +
        "<h1>Anda sedang offline</h1><p>Sambungkan internet untuk membuka halaman ini.</p>" +
        "<p><a href=\\"/\\">Kembali ke beranda</a></p></body></html>",
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
  })());
});
`;

const target = resolve(import.meta.dirname, "../public/sw.js");
const previous = (() => {
  try {
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
})();

writeFileSync(target, worker);
console.log(`${previous === worker ? "unchanged" : "written"}: public/sw.js (${worker.length} bytes)`);
