// frontend/tests/p5-003-notification-store.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const frontendRoot = resolve(import.meta.dirname, "..");
const modulePath = resolve(frontendRoot, "src", "lib", "notifications", "store.mjs");

const load = async () => import(pathToFileURL(modulePath).href);

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

test("a store with no saved choice starts with every category off", async () => {
  const { createPreferenceStore } = await load();
  const store = createPreferenceStore(memoryStorage());
  const snapshot = store.getSnapshot();
  assert.deepEqual(snapshot, {
    pengumuman: false,
    ibadah: false,
    "pelajari-alkitab": false,
    "sekolah-sabat": false,
  });
});

test("a saved choice is read back through normalisation", async () => {
  const { createPreferenceStore } = await load();
  const storage = memoryStorage({
    "rinegetan-notifikasi": JSON.stringify({ pengumuman: true, ibadah: "yes", extra: true }),
  });
  const snapshot = createPreferenceStore(storage).getSnapshot();
  assert.equal(snapshot.pengumuman, true);
  assert.equal(snapshot.ibadah, false, "a non-boolean must not enable a category");
  assert.equal("extra" in snapshot, false);
});

test("corrupt saved data falls back to everything off instead of throwing", async () => {
  const { createPreferenceStore } = await load();
  for (const raw of ["{not json", "null", "42", '"text"', "[]"]) {
    const store = createPreferenceStore(memoryStorage({ "rinegetan-notifikasi": raw }));
    assert.equal(store.getSnapshot().pengumuman, false, `expected all off for ${raw}`);
  }
});

test("the server snapshot is stable and always empty, so hydration matches", async () => {
  const { createPreferenceStore } = await load();
  const store = createPreferenceStore(memoryStorage());
  const first = store.getServerSnapshot();
  const second = store.getServerSnapshot();
  assert.equal(first, second, "the server snapshot must be the same object every time");
  assert.equal(first.pengumuman, false);
});

test("setting a choice persists it and notifies subscribers once", async () => {
  const { createPreferenceStore } = await load();
  const storage = memoryStorage();
  const store = createPreferenceStore(storage);
  let notified = 0;
  store.subscribe(() => void (notified += 1));

  store.set({ pengumuman: true, ibadah: true, "pelajari-alkitab": false, "sekolah-sabat": false });

  assert.equal(notified, 1);
  assert.equal(store.getSnapshot().pengumuman, true);
  assert.deepEqual(
    JSON.parse(storage.getItem("rinegetan-notifikasi")),
    { pengumuman: true, ibadah: true, "pelajari-alkitab": false, "sekolah-sabat": false },
  );
});

test("clearing turns everything off, forgets the saved choice and notifies", async () => {
  const { createPreferenceStore } = await load();
  const storage = memoryStorage({ "rinegetan-notifikasi": JSON.stringify({ pengumuman: true }) });
  const store = createPreferenceStore(storage);
  let notified = 0;
  store.subscribe(() => void (notified += 1));

  store.clear();

  assert.equal(notified, 1);
  assert.equal(store.getSnapshot().pengumuman, false);
  assert.equal(storage.getItem("rinegetan-notifikasi"), null);
});

test("a storage that throws on write still updates the in-memory snapshot", async () => {
  const { createPreferenceStore } = await load();
  const store = createPreferenceStore({
    getItem: () => null,
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  });
  assert.doesNotThrow(() => store.set({ pengumuman: true }));
  assert.equal(store.getSnapshot().pengumuman, true);
});

test("a missing storage is tolerated, for the server render", async () => {
  const { createPreferenceStore } = await load();
  const store = createPreferenceStore(null);
  assert.equal(store.getSnapshot().pengumuman, false);
  assert.doesNotThrow(() => store.set({ ibadah: true }));
  assert.equal(store.getSnapshot().ibadah, true);
});

test("unsubscribing stops further notifications", async () => {
  const { createPreferenceStore } = await load();
  const store = createPreferenceStore(memoryStorage());
  let notified = 0;
  const stop = store.subscribe(() => void (notified += 1));
  stop();
  store.set({ ibadah: true });
  assert.equal(notified, 0);
});
