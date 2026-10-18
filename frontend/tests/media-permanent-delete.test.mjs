import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const { executePermanentDelete } = await loadTypeScript("src/lib/staff/content-mutations.ts");
const params = { role: "admin", entityType: "media_assets", id: "asset-1", reason: "Foto duplikat" };

function deletionDatabase({ deleteError = null, storageError = null, missing = false, path = "derivatives/2026/10/photo.jpg" } = {}) {
  const calls = [];
  const deleted = { id: "asset-1", storage_path: path };
  const query = {
    eq(column, id) { assert.equal(column, "id"); assert.equal(id, "asset-1"); return this; },
    select() { return this; },
    async single() { return { data: missing ? null : deleted, error: deleteError }; },
    then(resolve, reject) { return Promise.resolve({ data: null, error: deleteError }).then(resolve, reject); },
  };
  const client = {
    async rpc(name) { assert.equal(name, "set_audit_reason"); return { error: null }; },
    from(table) { return { delete() { calls.push(`delete:${table}`); return query; } }; },
    storage: { from(bucket) { assert.equal(bucket, "media"); return {
      async remove(paths) { calls.push({ remove: paths }); return { data: storageError ? null : [{ name: path }], error: storageError }; },
    }; } },
  };
  return { client, calls };
}

test("deleting media removes its exact private derivative only after the row is deleted", async () => {
  const db = deletionDatabase();
  const result = await executePermanentDelete(db.client, params);
  assert.deepEqual(db.calls, ["delete:media_assets", { remove: ["derivatives/2026/10/photo.jpg"] }]);
  assert.equal(result.success, true);
  assert.equal(result.warning, undefined);
});

test("a failed metadata delete never removes Storage objects", async () => {
  const error = { code: "23503", message: "still used by a section banner" };
  const db = deletionDatabase({ deleteError: error });
  await assert.rejects(executePermanentDelete(db.client, params), (err) => err === error);
  assert.deepEqual(db.calls, ["delete:media_assets"]);
});

test("a missing row is not reported as a successful deletion", async () => {
  const db = deletionDatabase({ missing: true });
  await assert.rejects(executePermanentDelete(db.client, params));
  assert.deepEqual(db.calls, ["delete:media_assets"]);
});

test("a Storage failure reports pending cleanup without leaking its internal message", async () => {
  const db = deletionDatabase({ storageError: { code: "storage_error", message: "private storage failure details" } });
  const result = await executePermanentDelete(db.client, params);
  assert.equal(result.success, true);
  assert.match(result.warning, /penyimpanan|Storage/i);
  assert.doesNotMatch(result.warning, /private storage failure details/);
});

test("an unsafe path is never sent to Storage deletion", async () => {
  const db = deletionDatabase({ path: "derivatives/../private.jpg" });
  const result = await executePermanentDelete(db.client, params);
  assert.deepEqual(db.calls, ["delete:media_assets"]);
  assert.match(result.warning, /penyimpanan|Storage/i);
});

test("Editors cannot invoke permanent deletion or remove files", async () => {
  const db = deletionDatabase();
  await assert.rejects(executePermanentDelete(db.client, { ...params, role: "editor" }));
  assert.deepEqual(db.calls, []);
});

test("deleting ordinary content never accesses Storage", async () => {
  const db = deletionDatabase();
  await executePermanentDelete(db.client, { ...params, entityType: "events" });
  assert.deepEqual(db.calls, ["delete:events"]);
});
