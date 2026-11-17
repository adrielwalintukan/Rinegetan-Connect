import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CACHED_AT_HEADER,
  CACHE_STATUS_MESSAGE,
  RECENT_MS,
  STALE_MS,
  cacheAgeState,
  describeAge,
  storedCopyNotice,
} from "../src/lib/pwa/cache-status.mjs";
import * as shell from "../src/lib/pwa/shell.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (rel) => readFileSync(resolve(projectRoot, rel), "utf8");

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-16T12:00:00.000Z");
const at = (msAgo) => new Date(NOW - msAgo).toISOString();

test("P5-002 a copy with no usable stamp is never described", () => {
  // Nothing is claimed about a copy whose age is unknown. Guessing would be worse than silence:
  // a wrong "saved 3 hours ago" is a lie the visitor cannot check.
  assert.equal(cacheAgeState({ cachedAt: null, now: NOW }), "unknown");
  assert.equal(cacheAgeState({ cachedAt: undefined, now: NOW }), "unknown");
  assert.equal(cacheAgeState({ cachedAt: "not-a-date", now: NOW }), "unknown");
  assert.equal(storedCopyNotice({ cachedAt: null, now: NOW }), null);
});

test("P5-002 a page just fetched is not announced", () => {
  // Network-first means an online visit stores the page as it is fetched. Its age is a fraction of
  // a second, and a notice there would appear on every single visit.
  assert.equal(cacheAgeState({ cachedAt: at(2_000), now: NOW }), "recent");
  assert.equal(storedCopyNotice({ cachedAt: at(2_000), now: NOW }), null);
  assert.equal(cacheAgeState({ cachedAt: at(RECENT_MS - 1), now: NOW }), "recent");
  assert.equal(storedCopyNotice({ cachedAt: at(RECENT_MS - 1), now: NOW }), null);
});

test("P5-002 a copy under a day old is described as saved, with its age", () => {
  const state = cacheAgeState({ cachedAt: at(3 * HOUR), now: NOW });
  assert.equal(state, "saved");
  assert.equal(storedCopyNotice({ cachedAt: at(3 * HOUR), now: NOW }), "Salinan tersimpan · diperbarui 3 jam lalu.");

  // The owner chose 24 hours as the point where the wording becomes urgent.
  assert.equal(cacheAgeState({ cachedAt: at(STALE_MS - 1), now: NOW }), "saved");
  assert.equal(cacheAgeState({ cachedAt: at(STALE_MS), now: NOW }), "stale");
});

test("P5-002 a copy a day old or older is described as old, not merely saved", () => {
  const notice = storedCopyNotice({ cachedAt: at(STALE_MS), now: NOW });
  assert.equal(notice, "Salinan lama — isinya mungkin sudah berubah. Sambungkan internet lalu perbarui.");
  assert.equal(storedCopyNotice({ cachedAt: at(5 * 24 * HOUR), now: NOW }), notice);
});

test("P5-002 the relative age is coarse and readable in Indonesian", () => {
  assert.equal(describeAge({ cachedAt: at(30_000), now: NOW }), "baru saja");
  assert.equal(describeAge({ cachedAt: at(60_000), now: NOW }), "1 menit lalu");
  assert.equal(describeAge({ cachedAt: at(59 * 60_000), now: NOW }), "59 menit lalu");
  assert.equal(describeAge({ cachedAt: at(HOUR), now: NOW }), "1 jam lalu");
  assert.equal(describeAge({ cachedAt: at(23 * HOUR), now: NOW }), "23 jam lalu");
  assert.equal(describeAge({ cachedAt: at(24 * HOUR), now: NOW }), "kemarin");
  assert.equal(describeAge({ cachedAt: at(3 * 24 * HOUR), now: NOW }), "3 hari lalu");
});

test("P5-002 a clock that jumped backwards is treated as old, never as fresh", () => {
  // A device clock set into the future makes the age negative. Understating staleness is the worse
  // mistake, so an untrustworthy stamp is presented as old rather than as current.
  assert.equal(cacheAgeState({ cachedAt: at(-2 * HOUR), now: NOW }), "stale");
  assert.equal(storedCopyNotice({ cachedAt: at(-2 * HOUR), now: NOW })?.startsWith("Salinan lama"), true);
  assert.equal(describeAge({ cachedAt: at(-2 * HOUR), now: NOW }), null);
});

test("P5-002 the committed worker stamps stored pages and answers the age question", () => {
  const worker = read("public/sw.js");

  // The generated worker is what ships. If it lacks these, the notice has nothing to read.
  assert.match(worker, new RegExp(`const CACHED_AT_HEADER = "${CACHED_AT_HEADER}"`));
  assert.match(worker, new RegExp(`const CACHE_STATUS_MESSAGE = "${CACHE_STATUS_MESSAGE}"`));
  assert.match(worker, /data\.type === CACHE_STATUS_MESSAGE/, "the worker must answer the age question");
  assert.match(worker, /headers\.set\(CACHED_AT_HEADER, new Date\(\)\.toISOString\(\)\)/,
    "a stored page must carry the time it was fetched");

  // The stamp has to reach the stored copy. Matching the header alone would pass a worker that
  // defines `stamped` and then never calls it, which is exactly the bug worth catching: the notice
  // would silently never appear again.
  assert.match(worker, /cache\.put\(event\.request,\s*await stamped\(response\.clone\(\)\)\)/,
    "the stored page must go through the stamping function");
});

test("P5-002 the age answer never widens the cache boundary", () => {
  // Answering "how old is this" must not become a way to read a stored response for a forbidden
  // path. The handler only reports a timestamp, and the deny list is still applied to requests.
  const worker = read("public/sw.js");
  const handler = worker.slice(worker.indexOf("data.type === CACHE_STATUS_MESSAGE"));
  const body = handler.slice(0, handler.indexOf("port.postMessage"));
  assert.match(body, /cached\.headers\.get\(CACHED_AT_HEADER\)/);
  assert.doesNotMatch(body, /postMessage\([^)]*cached\b/, "only the timestamp may leave the worker");

  // The deny list is unchanged by P5-002: a stored copy of a staff or reader page still cannot exist.
  for (const prefix of ["/staff", "/api", "/auth", "/sekolah-sabat", "/pelajari-alkitab"]) {
    assert.ok(shell.FORBIDDEN_PREFIXES.includes(prefix), `${prefix} must stay forbidden`);
  }
  assert.equal(shell.strategyFor({ url: "https://x.test/staff", mode: "navigate" }, "https://x.test"), "bypass");
});

test("P5-002 the notice is wired into the public layout only", () => {
  const publicLayout = read("src/app/(public)/layout.tsx");
  assert.match(publicLayout, /StoredCopyNotice/, "public pages must show the notice");

  // The staff area must never render it: those pages have no worker and nothing stored.
  const rootLayout = read("src/app/layout.tsx");
  assert.doesNotMatch(rootLayout, /StoredCopyNotice/);
});

test("P5-002 the offline page is stored together with the chunks it needs", () => {
  // Found by a flaky test, not by reading: the offline page was served from cache while its scripts
  // were not, so the browser threw ChunkLoadError and the app's error boundary replaced the offline
  // page with "Halaman belum dapat ditampilkan". A visitor offline saw an error, not reassurance.
  const worker = read("public/sw.js");

  // The markup must be read before the response is stored: storing consumes the body, and a later
  // clone() throws. That exact mistake was made and it failed silently inside a catch.
  const markupRead = worker.indexOf("offlineResponse.clone().text()");
  const pageStored = worker.indexOf("cache.put(OFFLINE_URL, offlineResponse)");
  assert.ok(markupRead > 0, "the worker must read the offline markup to learn its chunks");
  assert.ok(pageStored > 0, "the worker must store the offline page");
  assert.ok(markupRead < pageStored, "the markup must be read before the page is stored");

  // And the collected chunks must actually be stored, not merely collected. This asserts on the
  // loop that stores them rather than on any mention of cache.put, because a mutation that empties
  // the list being iterated still leaves the call site in place and would otherwise pass.
  assert.match(worker, /url\.pathname\.startsWith\("\/_next\/static\/"\)/,
    "only build assets are collected from the offline markup");
  assert.match(worker, /offlineAssets\.add\(url\.pathname\)/);
  assert.match(worker, /\[\.\.\.offlineAssets\]\.map\(async \(path\) =>/,
    "the collected chunks must be iterated and stored, not collected and dropped");
  assert.match(worker, /cache\.put\(path, response\)/,
    "the collected chunks must be written to the cache");
});
