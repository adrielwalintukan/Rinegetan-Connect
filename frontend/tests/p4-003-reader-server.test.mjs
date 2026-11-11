import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as core from "../src/lib/sabbath/adventech.mjs";
import * as catalog from "../src/lib/sabbath/catalog.mjs";
import * as reader from "../src/lib/sabbath/reader.mjs";
import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";

const quarter = { id: "2026-04", index: "in-2026-04", lang: "in", title: "Quarter", start_date: "26/09/2026", end_date: "25/12/2026", cover: "https://sabbath-school.adventech.io/cover.png" };
const lesson = { id: "07", index: "in-2026-04-07", title: "Lesson", start_date: "07/11/2026", end_date: "13/11/2026" };
const day = { id: "01", index: "in-2026-04-07-01", title: "Day", date: "07/11/2026", read_path: "in/quarterlies/2026-04/lessons/07/days/01/read" };
const json = value => new Response(JSON.stringify(value), { headers: { "content-type": "application/json", etag: '"v1"' } });
function server(fail = () => null) {
  const requests = [], caches = [];
  const exports = {};
  const source = readFileSync(new URL("../src/lib/sabbath/server.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", "fetch", code)(id => {
    if (id === "server-only") return {};
    if (id === "./adventech.mjs") return core;
    if (id === "./catalog.mjs") return catalog;
    if (id === "./reader.mjs") return reader;
    if (id === "@/lib/supabase/server") return { createServerSupabaseClient: () => { throw new Error("Staff connection forbidden"); } };
    if (id === "next/cache") return { unstable_cache: (fn, keys, options) => {
      caches.push({ keys, options }); return fn;
    } };
    throw new Error(`Forbidden import invocation: ${id}`);
  }, exports, async (url, options) => {
    requests.push(url);
    assert.equal(options.redirect, "error"); assert.equal(options.cache, "no-store");
    const bad = fail(url); if (bad) return bad;
    if (url.endsWith("/days/01/read/index.json")) return json({ ...day, content: '<p>Readable <script>bad()</script>text</p>' });
    if (url.endsWith("/lessons/07/index.json")) return json({ lesson, days: [day] });
    if (url.endsWith("/2026-04/index.json")) return json({ quarterly: quarter, lessons: [lesson] });
    return json([quarter]);
  });
  return { ...exports, requests, caches };
}

test("reader loaders fetch constructed official endpoints and expose only validated HTML snapshots", async () => {
  const api = server();
  assert.equal(typeof api.loadSabbathDay, "function");
  const result = await api.loadSabbathDay("2026-04", "07", "01");
  assert.equal(result.status, "available");
  assert.equal(result.data.html, "<p>Readable text</p>");
  assert.equal(result.sourceUrl, "https://sabbath-school.adventech.io/in/2026-04/07/01");
  assert.equal(result.sourceVersion, '"v1"');
  assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
  assert.deepEqual(api.requests.slice(-2), [
    "https://sabbath-school.adventech.io/api/v2/in/quarterlies/2026-04/lessons/07/index.json",
    "https://sabbath-school.adventech.io/api/v2/in/quarterlies/2026-04/lessons/07/days/01/read/index.json",
  ]);
  assert.ok(api.caches.every(entry => entry.options.revalidate === 3600));
});

test("invalid route IDs never fetch and nonmembers never fetch child endpoints", async () => {
  const api = server();
  assert.equal(typeof api.loadSabbathLesson, "function");
  for (const args of [["../private", "07", "01"], ["2026-04", "../", "01"], ["2026-04", "07", "99/x"]]) {
    assert.deepEqual(await api.loadSabbathDay(...args), { status: "not-found" });
  }
  assert.equal(api.requests.length, 0);
  assert.deepEqual(await api.loadSabbathLesson("2025-04", "07"), { status: "not-found" });
  assert.deepEqual(await api.loadSabbathLesson("2026-04", "99"), { status: "not-found" });
  assert.deepEqual(await api.loadSabbathDay("2026-04", "07", "99"), { status: "not-found" });
  assert.ok(!api.requests.some(url => /2025-04|lessons\/99|days\/99/.test(url)));
});

test("reader failures are unavailable rather than a cached valid snapshot or a false 404", async () => {
  for (const bad of [
    () => new Response("<html>SPA</html>", { headers: { "content-type": "text/html" } }),
    () => json({ ...day, index: "en-2026-04-07-01", content: "text" }),
    () => json({ ...day, content: "<script>bad()</script>" }),
    () => new Response("{}", { headers: { "content-type": "application/json" } }),
  ]) {
    const api = server(url => url.includes("/days/") ? bad() : null);
    assert.equal(typeof api.loadSabbathDay, "function");
    assert.deepEqual(await api.loadSabbathDay("2026-04", "07", "01"), { status: "unavailable" });
  }
});

test("installed Next cache retains the same-key legal snapshot when background revalidation fails", async () => {
  const require = createRequire(import.meta.url);
  globalThis.AsyncLocalStorage = AsyncLocalStorage;
  const { unstable_cache } = require("next/cache");
  const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
  const entries = new Map(); let stale = false, offline = false;
  const store = { incrementalCache: {
    generateSimpleCacheKey: async key => key,
    get: async key => entries.has(key) ? { value: entries.get(key), isStale: stale } : null,
    set: async (key, value) => { entries.set(key, value); },
  } };
  const cached = unstable_cache(async () => {
    if (offline) throw new Error("Upstream offline");
    return { html: "<p>Legal snapshot</p>", fetchedAt: "2026-11-11T00:00:00Z" };
  }, ["reader-cache-regression"], { revalidate: 3600 });
  const previousError = console.error;
  try {
    const first = await workAsyncStorage.run(store, () => cached("in-2026-04-07-01", "2026-11-11"));
    await Promise.all(Object.values(store.pendingRevalidates));
    store.pendingRevalidates = {}; stale = true; offline = true;
    console.error = () => {}; // Next reports expected background source failure.
    const fallback = await workAsyncStorage.run(store, () => cached("in-2026-04-07-01", "2026-11-11"));
    await Promise.all(Object.values(store.pendingRevalidates));
    assert.deepEqual(fallback, first);
    assert.equal(entries.size, 1);
    await assert.rejects(workAsyncStorage.run(store, () => cached("in-2026-04-07-01", "2026-11-12")), /offline/);
  } finally { console.error = previousError; }
});
