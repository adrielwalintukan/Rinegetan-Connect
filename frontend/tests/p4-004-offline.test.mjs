import test from "node:test";
import assert from "node:assert/strict";

const offline = await import("../src/lib/sabbath/offline.mjs").catch(() => ({}));

const quarterId = "2026-04";
const lessons = ["07", "08"];

function manifest(overrides = {}) {
  return offline.createManifest({
    quarterId,
    lessons,
    lessonIds: lessons,
    createdAt: "2026-11-11T10:00:00.000Z",
    sizeBytes: 1_048_576,
    ...overrides,
  });
}

test("the rights gate is closed and cannot be opened by a caller", () => {
  assert.equal(offline.OFFLINE_ENABLED, false);
  assert.equal(offline.offlineEnabled(), false);
});

test("a manifest carries version, size, created_at and a visible label", () => {
  assert.equal(typeof offline.createManifest, "function");
  const result = manifest();
  assert.equal(result.quarterId, quarterId);
  assert.deepEqual(result.lessonIds, lessons);
  assert.equal(result.version, 1);
  assert.equal(result.sizeBytes, 1_048_576);
  assert.equal(result.createdAt, "2026-11-11T10:00:00.000Z");
  assert.match(result.label, /2026-04/);
  assert.match(result.label, /1,0 MB|1 MB/);
});

test("a manifest refuses ids the reader could never produce", () => {
  for (const bad of [
    { quarterId: "2026-05" },
    { quarterId: "evil" },
    { lessonIds: [] },
    { lessonIds: ["7"] },
    { lessonIds: ["07", "07"] },
    { lessonIds: ["07", "xx"] },
    { createdAt: "11 November 2026" },
    { sizeBytes: -1 },
    { sizeBytes: Number.NaN },
    { sizeBytes: 1.5 },
  ]) {
    assert.equal(offline.createManifest({ quarterId, lessonIds: lessons, createdAt: "2026-11-11T10:00:00.000Z", sizeBytes: 1, ...bad }), null, JSON.stringify(bad));
  }
});

test("a stored manifest is revalidated instead of trusted", () => {
  const good = manifest();
  assert.deepEqual(offline.parseManifest(JSON.stringify(good)), good);

  for (const raw of [
    null,
    "not json",
    JSON.stringify({ ...good, version: 2 }),
    JSON.stringify({ ...good, quarterId: "../evil" }),
    JSON.stringify({ ...good, lessonIds: ["07", 42] }),
    JSON.stringify({ ...good, sizeBytes: -5 }),
    JSON.stringify({ ...good, createdAt: "kemarin" }),
  ]) {
    assert.equal(offline.parseManifest(raw), null, String(raw).slice(0, 60));
  }
});

test("a newer version is announced, never downloaded on its own", () => {
  const stored = manifest();
  const newer = manifest({ version: 2, createdAt: "2026-12-01T10:00:00.000Z", sizeBytes: 2_097_152 });
  assert.equal(offline.updateAvailable(stored, newer), true);
  assert.equal(offline.updateAvailable(stored, stored), false);
  assert.equal(offline.updateAvailable(newer, stored), false);
  assert.equal(offline.updateAvailable(stored, null), false);
  assert.equal(offline.updateAvailable(null, newer), false);
});

test("progress survives an update that keeps the same lesson ids", () => {
  const stored = manifest();
  const progress = { "2026-04/07/05": true, "2026-04/08/01": true };
  assert.deepEqual(offline.carryProgress(progress, stored, manifest({ version: 2 })), progress);

  // A lesson dropped from the package cannot keep a progress entry pointing at it.
  const narrower = manifest({ lessonIds: ["07"] });
  assert.deepEqual(offline.carryProgress(progress, stored, narrower), { "2026-04/07/05": true });
  assert.deepEqual(offline.carryProgress(progress, stored, null), {});
});
