import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as shell from "../src/lib/pwa/shell.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (rel) => readFileSync(resolve(projectRoot, rel), "utf8");

// Reads width/height straight out of the PNG IHDR chunk, so the assertion is about the real file
// rather than a number someone typed into the manifest.
function pngSize(rel) {
  const buffer = readFileSync(resolve(projectRoot, rel));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${rel} must be a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("P5-001 the manifest declares everything an install prompt requires", async () => {
  const manifest = (await import("../src/app/manifest.ts")).default();

  assert.equal(manifest.name, "GMAHK Rinegetan");
  assert.equal(manifest.short_name, "GMAHK Rinegetan");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "id");
  assert.match(manifest.theme_color, /^#[0-9A-F]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9A-F]{6}$/i);
  // Chrome will not offer installation without a 192 and a 512 icon.
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes("192x192"), "manifest must declare a 192x192 icon");
  assert.ok(sizes.includes("512x512"), "manifest must declare a 512x512 icon");
  assert.ok(
    manifest.icons.some((icon) => icon.purpose === "maskable"),
    "manifest must declare a maskable icon so Android does not crop the mark",
  );
});

test("P5-001 every declared icon exists at exactly the size it claims", async () => {
  const manifest = (await import("../src/app/manifest.ts")).default();

  for (const icon of manifest.icons) {
    const path = `public${icon.src}`;
    assert.ok(existsSync(resolve(projectRoot, path)), `${path} must exist`);
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.deepEqual(pngSize(path), { width, height }, `${path} must really be ${icon.sizes}`);
  }

  // iOS reads this one instead of the manifest, so a wrong size shows a blurry home-screen icon.
  assert.deepEqual(pngSize("public/apple-icon-180.png"), { width: 180, height: 180 });
});

test("P5-001 the root layout wires the manifest, the iOS icon and the theme colour", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/, "layout must link the manifest");
  assert.match(layout, /apple-icon-180\.png/, "layout must declare the iOS icon");
  assert.match(layout, /themeColor/, "layout must declare a theme colour");
});

test("P5-001 the offline shell never caches staff, API or lesson material", () => {
  for (const path of ["/staff", "/staff/login", "/api/doa", "/auth/confirm", "/sekolah-sabat/2026-04/07/01", "/pelajari-alkitab/iman"]) {
    assert.equal(shell.isForbiddenPath(path), true, `${path} must never be cached`);
  }
  for (const path of ["/", "/kontak", "/offline"]) {
    assert.equal(shell.isForbiddenPath(path), false, `${path} is part of the public shell`);
  }

  // A prefix rule must not swallow unrelated paths that merely start with the same letters.
  assert.equal(shell.isForbiddenPath("/staffroom"), false);
});

test("P5-001 precache list holds no forbidden route and no reader route", () => {
  for (const route of [...shell.SHELL_ROUTES, ...shell.SHELL_ASSETS]) {
    assert.equal(shell.isForbiddenPath(route), false, `${route} is in the precache but is forbidden`);
  }
  // The two reader families are gated by P4-005; a cached copy would grant offline material.
  for (const route of shell.SHELL_ROUTES) {
    assert.ok(!route.startsWith("/sekolah-sabat"), `${route} must not be precached`);
    assert.ok(!route.startsWith("/pelajari-alkitab"), `${route} must not be precached`);
  }
});

test("P5-001 the strategy refuses anything that is not a public GET", () => {
  const origin = "https://www.gmahkrinegetan.web.id";
  const req = (url, extra = {}) => ({ url, method: "GET", mode: "navigate", ...extra });

  assert.equal(shell.strategyFor(req(`${origin}/kontak`), origin), "network-first");
  assert.equal(shell.strategyFor(req(`${origin}/`), origin), "network-first");
  assert.equal(shell.strategyFor(req(`${origin}/_next/static/chunks/main.js`), origin), "cache-first");
  assert.equal(shell.strategyFor(req(`${origin}/icon-192.png`), origin), "cache-first");

  // A forbidden path is bypassed even when it looks like a normal navigation.
  assert.equal(shell.strategyFor(req(`${origin}/staff`), origin), "bypass");
  assert.equal(shell.strategyFor(req(`${origin}/api/doa`), origin), "bypass");
  assert.equal(shell.strategyFor(req(`${origin}/sekolah-sabat/2026-04`), origin), "bypass");
  // A reader URL fetched by script is not a shell navigation either.
  assert.equal(shell.strategyFor(req(`${origin}/pelajari-alkitab`), origin), "bypass");
  // Non-navigation fetches to a shell route are not cached: only whole pages are the shell.
  assert.equal(shell.strategyFor(req(`${origin}/kontak`, { mode: "cors" }), origin), "bypass");
  assert.equal(shell.strategyFor(req(`${origin}/kontak`, { method: "POST" }), origin), "bypass");
  // Another origin is never touched.
  assert.equal(shell.strategyFor(req("https://sabbath-school.adventech.io/in/2026-04"), origin), "bypass");
});

test("P5-001 the cache name is per build and rejects an unusable id", () => {
  assert.equal(shell.cacheName("abc123"), "rinegetan-shell-abc123");
  assert.notEqual(shell.cacheName("abc123"), shell.cacheName("def456"));
  for (const bad of ["", "../evil", "with space", "a".repeat(41), null, 42]) {
    assert.throws(() => shell.cacheName(bad), /Invalid build id/, String(bad));
  }
});

test("P5-001 the committed worker is the generated policy, not a hand-edited copy", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /GENERATED FILE/, "public/sw.js must stay generated");

  // Every policy value must appear in the shipped worker, so editing the module without
  // regenerating cannot silently leave the browser on an older list.
  for (const route of shell.SHELL_ROUTES) {
    assert.ok(worker.includes(JSON.stringify(route)), `${route} missing from public/sw.js`);
  }
  for (const prefix of shell.FORBIDDEN_PREFIXES) {
    assert.ok(worker.includes(JSON.stringify(prefix)), `${prefix} missing from public/sw.js`);
  }
  assert.ok(worker.includes('"/offline"'), "worker must precache the offline page");
  assert.ok(worker.includes("SKIP_WAITING"), "worker must support the update path");
  assert.ok(worker.includes("RESET_CACHE"), "worker must support the recovery path");
});

test("P5-001 the service worker is registered on public pages only", () => {
  const publicLayout = read("src/app/(public)/layout.tsx");
  assert.match(publicLayout, /ServiceWorkerUpdate/, "public layout must register the worker");

  // The root layout covers /staff too, so registering there would cache authenticated pages.
  const rootLayout = read("src/app/layout.tsx");
  assert.doesNotMatch(rootLayout, /serviceWorker\.register/, "root layout must not register a worker");
  assert.doesNotMatch(rootLayout, /ServiceWorkerUpdate/, "root layout must not mount the registrar");
});

test("P5-001 the worker script is served uncached so an old shell cannot be pinned", () => {
  const config = read("next.config.ts");
  assert.match(config, /source:\s*"\/sw\.js"/, "next.config must set headers for /sw.js");
  assert.match(config, /no-cache/, "the worker script must not be cached");
  assert.match(config, /generateBuildId/, "the build id must be derived, not hand-bumped");
});

test("P5-001 the update banner announces a replacement, never a first install", async () => {
  const update = await import("../src/lib/pwa/update.mjs");

  // Only a worker that finished installing over an existing controller is a real update.
  assert.equal(update.shouldAnnounceUpdate({ state: "installed", hasController: true }), true);
  // A first install has no previous shell to move away from, so announcing it would ask the
  // visitor to reload for nothing.
  assert.equal(update.shouldAnnounceUpdate({ state: "installed", hasController: false }), false);
  for (const state of ["installing", "activating", "activated", "redundant", null, undefined]) {
    assert.equal(update.shouldAnnounceUpdate({ state, hasController: true }), false, String(state));
  }
});

test("P5-001 a controller change reloads once, and never on the first claim", async () => {
  const update = await import("../src/lib/pwa/update.mjs");

  // A returning visitor whose worker was replaced must be moved onto the new shell.
  assert.equal(update.shouldReloadOnControllerChange({ controlledOnLoad: true }), true);
  // The first `clients.claim()` fires the same event on a page that arrived from the network.
  // Reloading there restarts the page under a visitor who just arrived, which is a real bug this
  // guard was written for.
  assert.equal(update.shouldReloadOnControllerChange({ controlledOnLoad: false }), false);
  // Two reloads in a row would mean the click handler and this listener both fired.
  assert.equal(
    update.shouldReloadOnControllerChange({ controlledOnLoad: true, alreadyReloading: true }),
    false,
  );
});

test("P5-001 the banner uses those decisions instead of inlining its own", () => {
  const source = read("src/components/runtime/ServiceWorkerUpdate.tsx");
  assert.match(source, /shouldAnnounceUpdate/, "banner must use the tested decision function");
  assert.match(source, /shouldReloadOnControllerChange/, "reload must use the tested decision function");
  // The exact bug that was found and fixed: an unconditional reload on controllerchange.
  assert.doesNotMatch(
    source,
    /const onControllerChange = \(\) => \{\s*if \(reloading\.current\) return;/,
    "controllerchange must not reload unconditionally",
  );
  assert.match(source, /role="status"/, "the banner must be announced to screen readers");
  assert.match(source, /SKIP_WAITING/, "applying the update must ask the worker to activate");
});

test("P5-001 the banner re-checks state instead of reading it once at updatefound", () => {
  const source = read("src/components/runtime/ServiceWorkerUpdate.tsx");

  // `updatefound` fires while the new worker is still "installing". Reading `worker.state` only
  // there means the "installed" condition is never observed and the banner never appears. This is
  // the second real defect found against the deployed site.
  assert.match(
    source,
    /addEventListener\(\s*"statechange"/,
    "the banner must listen for statechange, or it can never observe the installed state",
  );
});

test("P5-001 applying an update targets the waiting worker, not the active one", () => {
  const source = read("src/components/runtime/ServiceWorkerUpdate.tsx");

  // Sending SKIP_WAITING to `navigator.serviceWorker.controller` messages the worker that is
  // already running, which ignores it: no controllerchange follows and the button looks dead.
  assert.doesNotMatch(
    source,
    /controller\?\.postMessage\(\s*\{\s*type:\s*"SKIP_WAITING"/,
    "SKIP_WAITING must not be sent to the active controller",
  );
  // The message goes to a target resolved from the waiting slot, never to the controller.
  assert.match(
    source,
    /const target = [^;]*waiting[^;]*;[\s\S]{0,200}?target\?\.postMessage\(\s*\{\s*type:\s*"SKIP_WAITING"/,
    "SKIP_WAITING must be sent to a worker resolved from the waiting slot",
  );
});

test("P5-001 the apply button never messages a stale worker", () => {
  const source = read("src/components/runtime/ServiceWorkerUpdate.tsx");

  // Found on the live site during a deploy window: the banner was already on screen when the
  // browser replaced the waiting worker. The ref still pointed at the superseded object, so
  // SKIP_WAITING went nowhere, no controllerchange fired, and the button did nothing. The
  // registration's current slot has to win, with the ref only as a fallback.
  assert.match(
    source,
    /registrationRef\.current\?\.waiting\s*\?\?\s*waitingWorker\.current/,
    "apply must read the live waiting slot first, falling back to the tracked worker",
  );
  assert.match(
    source,
    /registrationRef\.current\s*=\s*registered/,
    "the registration must be captured so the click handler can read its waiting slot",
  );
});

