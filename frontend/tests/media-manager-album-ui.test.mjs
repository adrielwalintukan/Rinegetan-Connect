import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as constants from "../src/lib/media/constants.mjs";
import { clientErrorMessage } from "../src/lib/api/errors.mjs";

const require = createRequire(import.meta.url);
const album = {
  id: "11111111-1111-4111-8111-111111111111", title: "Album Uji", slug: "album-uji",
  category: "umum", occurred_on: "2026-10-18", status: "published",
  public_download_enabled: false, created_at: "2026-10-18", updated_at: "2026-10-18",
};
const asset = {
  id: "22222222-2222-4222-8222-222222222222", storage_path: "test/foto.jpg",
  mime_type: "image/jpeg", bytes: 1024, alt_text: "Foto uji", processing_state: "ready",
  public_download_enabled: false, consent_status: "approved", subject_age_group: "general",
  category: "umum", status: "draft", created_at: "2026-10-18", updated_at: "2026-10-18",
};
const UploadBoundary = () => null;
function loadManager(react = React) {
  const filename = new URL("../src/components/staff/MediaManager.tsx", import.meta.url);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const boundaries = {
    react,
    "./MediaUploadDialog": { MediaUploadDialog: UploadBoundary },
    "@/lib/media/url": { getMediaPublicUrl: (path) => `/api/media/file/${path}` },
    "@/lib/media/constants": constants,
    "@/lib/api/errors": { clientErrorMessage },
    "@/components/ui/modal": { Modal: () => null, MODAL_BACKDROP: "" },
    "@/components/ui/SelectDropdown": { SelectDropdown: () => null },
  };
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", output)(
    (id) => id in boundaries ? boundaries[id] : require(id), loadedModule, loadedModule.exports,
  );
  return loadedModule.exports.MediaManager;
}
function props(overrides = {}) {
  return { initialAssets: [], initialAlbums: [album], role: "admin", userEmail: "staff@example.test", onNotification() {}, ...overrides };
}
function nodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...nodes(node.props.children, predicate)];
}
// Run the real component and its handlers; replace hooks only to inspect each state without a browser DOM.
function harness(overrides = {}) {
  const state = [];
  let cursor = 0;
  const notifications = [];
  const Component = loadManager({
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useMemo: (compute) => compute(),
  });
  const input = props({ ...overrides, onNotification: (...args) => notifications.push(args) });
  return { notifications, render() { cursor = 0; return Component(input); } };
}
function albumCheckbox(tree) {
  const checkbox = nodes(tree, (node) => node.type === "input" && node.props["aria-label"] === "Izinkan unduhan album Album Uji")[0];
  assert.ok(checkbox, "album has a checkbox named with its title");
  return checkbox;
}
const response = (data, ok = true) => ({ ok, json: async () => data });

test("album controls render real album names, initial flags and draft visibility context", () => {
  const Component = loadManager();
  const html = renderToStaticMarkup(React.createElement(Component, props({ initialAlbums: [
    album, { ...album, id: "draft-album", title: "Album Draft", status: "draft", public_download_enabled: true },
  ] })));
  assert.match(html, /Unduhan album/);
  assert.match(html, /aria-label="Izinkan unduhan album Album Uji"/);
  assert.match(html, /aria-label="Izinkan unduhan album Album Draft"[^>]*checked=""/);
  assert.match(html, /hanya tersedia setelah album diterbitkan/i);
});
test("empty album data renders an explicit empty state", () => {
  const Component = loadManager();
  const html = renderToStaticMarkup(React.createElement(Component, props({ initialAlbums: [] })));
  assert.match(html, /Belum ada album/);
  assert.doesNotMatch(html, /Izinkan unduhan album/);
});
test("album toggle waits for success, disables controls, sends the contract and updates upload albums", async (t) => {
  let finish;
  const calls = [];
  t.mock.method(globalThis, "fetch", (url, init) => {
    calls.push([url, init]);
    return new Promise((resolve) => { finish = resolve; });
  });
  const ui = harness();
  const pending = albumCheckbox(ui.render()).props.onChange({ target: { checked: true } });
  const inFlight = albumCheckbox(ui.render());
  assert.equal(inFlight.props.checked, false);
  assert.equal(inFlight.props.disabled, true);
  assert.equal(calls[0][0], "/api/staff/media/album-download");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body), { albumId: album.id, enabled: true });
  finish(response({ success: true, data: { ...album, public_download_enabled: true } }));
  await pending;
  const tree = ui.render();
  assert.equal(albumCheckbox(tree).props.checked, true);
  assert.equal(albumCheckbox(tree).props.disabled, false);
  assert.equal(nodes(tree, (node) => node.type === UploadBoundary)[0].props.albums[0].public_download_enabled, true);
  assert.equal(ui.notifications[0][0], "success");
});
test("album toggle failure keeps the old flag and shows the friendly server message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({ error: "forbidden", message: "Anda tidak memiliki izin untuk mengubah album." }, false));
  const ui = harness();
  await albumCheckbox(ui.render()).props.onChange({ target: { checked: true } });
  assert.equal(albumCheckbox(ui.render()).props.checked, false);
  assert.equal(albumCheckbox(ui.render()).props.disabled, false);
  assert.deepEqual(ui.notifications, [["error", "Anda tidak memiliki izin untuk mengubah album."]]);
});
test("album network failure uses the client connection message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  const ui = harness();
  await albumCheckbox(ui.render()).props.onChange({ target: { checked: true } });
  assert.equal(albumCheckbox(ui.render()).props.checked, false);
  assert.match(ui.notifications[0][1], /Periksa koneksi internet/);
});
test("successful metadata deletion removes the card and reports the storage cleanup warning", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({ success: true, data: { success: true, deletedId: asset.id, warning: "Data media dihapus, tetapi berkas penyimpanan belum dapat dibersihkan." } }));
  const previousWindow = globalThis.window;
  globalThis.window = { confirm: () => true };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  const ui = harness({ initialAssets: [asset] });
  await nodes(ui.render(), (node) => node.type === "button" && node.props["aria-label"] === "Hapus aset permanen")[0].props.onClick();
  assert.equal(nodes(ui.render(), (node) => node.type === "img").length, 0);
  assert.deepEqual(ui.notifications, [["error", "Data media dihapus, tetapi berkas penyimpanan belum dapat dibersihkan."]]);
});
test("failed metadata deletion keeps the card", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({ error: "Gagal menghapus aset media" }, false));
  const previousWindow = globalThis.window;
  globalThis.window = { confirm: () => true };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  const ui = harness({ initialAssets: [asset] });
  await nodes(ui.render(), (node) => node.type === "button" && node.props["aria-label"] === "Hapus aset permanen")[0].props.onClick();
  assert.equal(nodes(ui.render(), (node) => node.type === "img").length, 1);
  assert.equal(ui.notifications[0][0], "error");
});
