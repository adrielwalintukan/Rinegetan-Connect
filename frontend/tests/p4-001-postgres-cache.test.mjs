import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresCache } from "../src/lib/sabbath/adventech.mjs";

const snapshot = { sourceId: "id-2026-01", sourceVersion: "v1",
  fetchedAt: "2026-01-01T00:00:00.000Z", etag: '"v1"', payload: { example: "synthetic" } };

test("reads and writes snapshots through the PostgreSQL RPC boundary", async () => {
  const calls = [];
  const cache = createPostgresCache({ rpc: async (name, args) => {
    calls.push([name, args]);
    if (name === "sabbath_cache_read") return { data: [{ source_id: snapshot.sourceId, source_version: snapshot.sourceVersion,
      fetched_at: snapshot.fetchedAt, etag: snapshot.etag, payload: snapshot.payload }], error: null };
    return { data: true, error: null };
  } });
  assert.deepEqual(await cache.readCache(snapshot.sourceId), snapshot);
  await cache.writeCache(snapshot);
  assert.deepEqual(calls, [
    ["sabbath_cache_read", { p_source_id: snapshot.sourceId }],
    ["sabbath_cache_write", { p_source_id: snapshot.sourceId, p_source_version: snapshot.sourceVersion,
      p_fetched_at: snapshot.fetchedAt, p_etag: snapshot.etag, p_payload: snapshot.payload }],
  ]);
});

test("missing cache is empty, but database errors and rejected writes fail closed", async () => {
  const empty = createPostgresCache({ rpc: async () => ({ data: [], error: null }) });
  assert.equal(await empty.readCache("id-2026-01"), null);
  const denied = createPostgresCache({ rpc: async () => ({ data: null, error: { code: "42501" } }) });
  await assert.rejects(denied.readCache("id-2026-01"));
  await assert.rejects(denied.writeCache(snapshot));
  const outdated = createPostgresCache({ rpc: async () => ({ data: false, error: null }) });
  await assert.rejects(outdated.writeCache(snapshot));
});
