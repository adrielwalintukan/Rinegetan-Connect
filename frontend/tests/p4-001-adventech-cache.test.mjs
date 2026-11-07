import test from "node:test";
import assert from "node:assert/strict";
import { refreshQuarterly } from "../src/lib/sabbath/adventech.mjs";

const input = () => ({
  quarterly: { id: "2026-01", index: "id-2026-01", lang: "id", title: "Contoh",
    cover: "https://example.invalid/cover.jpg", credits: [{ name: "Sumber", value: "Penerbit" }] },
  lessons: [{ id: "01", index: "id-2026-01-01", title: "Satu" }],
});
const old = { sourceId: "id-2026-01", sourceVersion: "lama", fetchedAt: "2026-01-01T00:00:00.000Z", etag: null,
  payload: { id: "2026-01", index: "id-2026-01", language: "id", title: "Lama",
    cover: "https://example.invalid/cover.jpg", credits: [{ name: "Sumber", value: "Penerbit" }],
    lessons: [{ id: "01", index: "id-2026-01-01", title: "Satu", position: 1 }] } };
const make = (overrides = {}) => {
  const calls = [];
  const dependencies = {
    authorized: async () => true,
    fetchQuarterly: async () => { calls.push("fetch"); return { payload: input(), sourceVersion: "v1", etag: null }; },
    readCache: async () => { calls.push("read"); return old; },
    writeCache: async (value) => { calls.push(["write", value]); },
    now: () => new Date("2026-11-08T00:00:00.000Z"),
    ...overrides,
  };
  return { calls, dependencies };
};

test("closed rights gate reads and writes nothing", async () => {
  const { calls, dependencies } = make({ authorized: async () => false });
  assert.deepEqual(await refreshQuarterly("id-2026-01", dependencies), { status: "unavailable" });
  assert.deepEqual(calls, []);
});

test("valid synthetic source replaces the cached snapshot", async () => {
  const { calls, dependencies } = make();
  const result = await refreshQuarterly("id-2026-01", dependencies);
  assert.equal(result.status, "fresh");
  assert.equal(result.data.sourceVersion, "v1");
  assert.equal(result.data.fetchedAt, "2026-11-08T00:00:00.000Z");
  assert.equal(result.data.payload.title, "Contoh");
  assert.deepEqual(calls.map((x) => Array.isArray(x) ? x[0] : x), ["fetch", "write"]);
});

test("invalid or failed source preserves the last cache", async () => {
  for (const fetchQuarterly of [
    async () => { throw new Error("upstream"); },
    async () => ({ payload: { ...input(), lessons: [] }, sourceVersion: "v1", etag: null }),
    async () => ({ payload: input(), sourceVersion: "", etag: null }),
  ]) {
    const { calls, dependencies } = make({ fetchQuarterly });
    assert.deepEqual(await refreshQuarterly("id-2026-01", dependencies), { status: "cached", data: old });
    assert.deepEqual(calls, ["read"]);
  }
});

test("rights revoked during retrieval never returns data or writes cache", async () => {
  let calls = 0;
  const context = make({ authorized: async () => ++calls === 1 });
  assert.deepEqual(await refreshQuarterly("id-2026-01", context.dependencies), { status: "unavailable" });
  assert.deepEqual(context.calls, ["fetch"]);
});

test("cache from a different source is never returned on failure", async () => {
  const context = make({ fetchQuarterly: async () => { throw new Error("upstream"); } });
  assert.deepEqual(await refreshQuarterly("id-2026-02", context.dependencies), { status: "unavailable" });
});

test("invalid or unvalidated cached snapshots never become fallback", async () => {
  for (const cached of [{ ...old, fetchedAt: "bad" }, { ...old, payload: { ...old.payload, credits: [] } },
    { ...old, payload: { ...old.payload, index: "another-source" } }]) {
    const context = make({ fetchQuarterly: async () => { throw new Error("upstream"); }, readCache: async () => cached });
    assert.deepEqual(await refreshQuarterly("id-2026-01", context.dependencies), { status: "unavailable" });
  }
});
