import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const frontendRoot = resolve(import.meta.dirname, "..");
const modulePath = resolve(frontendRoot, "src", "lib", "notifications", "preferences.mjs");

const load = async () => import(pathToFileURL(modulePath).href);

test("the four church categories exist and are the only ones accepted", async () => {
  const mod = await load();
  assert.deepEqual(mod.CATEGORIES, [
    "pengumuman",
    "ibadah",
    "pelajari-alkitab",
    "sekolah-sabat",
  ]);
});

test("a fresh preference set starts with everything off", async () => {
  const { emptyPreferences, CATEGORIES } = await load();
  const empty = emptyPreferences();
  for (const category of CATEGORIES) {
    assert.equal(empty[category], false, `${category} must start off so nothing is sent without opt-in`);
  }
});

test("normalising a stored record keeps only known categories and coerces to boolean", async () => {
  const { normalizePreferences, CATEGORIES } = await load();
  const result = normalizePreferences({
    pengumuman: true,
    ibadah: "yes",
    "pelajari-alkitab": 1,
    "sekolah-sabat": false,
    unknownCategory: true,
  });
  assert.equal(result.pengumuman, true);
  assert.equal(result.ibadah, false, "a non-boolean truthy value must not enable a category");
  assert.equal(result["pelajari-alkitab"], false);
  assert.equal(result["sekolah-sabat"], false);
  assert.equal("unknownCategory" in result, false);
  assert.deepEqual(Object.keys(result).sort(), [...CATEGORIES].sort());
});

test("normalising junk returns everything off instead of throwing", async () => {
  const { normalizePreferences, CATEGORIES } = await load();
  for (const junk of [null, undefined, 42, "text", [], true]) {
    const result = normalizePreferences(junk);
    for (const category of CATEGORIES) {
      assert.equal(result[category], false, `${category} must be off for junk input ${JSON.stringify(junk)}`);
    }
  }
});

test("stop-all turns every category off and is detected", async () => {
  const { allOff, setAllOff, normalizePreferences, CATEGORIES } = await load();
  const on = normalizePreferences({ pengumuman: true, ibadah: true, "pelajari-alkitab": true, "sekolah-sabat": true });
  assert.equal(allOff(on), false);
  const stopped = setAllOff(on);
  assert.equal(allOff(stopped), true);
  for (const category of CATEGORIES) {
    assert.equal(stopped[category], false);
  }
});

test("nothing may be delivered when no category is enabled", async () => {
  const { emptyPreferences, shouldDeliver } = await load();
  for (const category of ["pengumuman", "ibadah", "pelajari-alkitab", "sekolah-sabat"]) {
    assert.equal(
      shouldDeliver(emptyPreferences(), category),
      false,
      `no delivery is allowed for ${category} without opt-in`,
    );
  }
});

test("delivery follows the chosen category only", async () => {
  const { normalizePreferences, shouldDeliver } = await load();
  const prefs = normalizePreferences({ pengumuman: true, ibadah: false });
  assert.equal(shouldDeliver(prefs, "pengumuman"), true);
  assert.equal(shouldDeliver(prefs, "ibadah"), false);
  assert.equal(shouldDeliver(prefs, "sekolah-sabat"), false);
});

test("an unknown category is never delivered", async () => {
  const { normalizePreferences, shouldDeliver } = await load();
  const prefs = normalizePreferences({ pengumuman: true });
  assert.equal(shouldDeliver(prefs, "promosi"), false);
  assert.equal(shouldDeliver(prefs, ""), false);
  assert.equal(shouldDeliver(prefs, undefined), false);
});

test("the consent record carries a version, timestamp and the enabled categories only", async () => {
  const { buildConsentRecord, normalizePreferences } = await load();
  const prefs = normalizePreferences({ pengumuman: true, "sekolah-sabat": true });
  const record = buildConsentRecord(prefs, new Date("2026-11-17T01:00:00.000Z"));
  assert.equal(record.consent_version, "2026-11-17");
  assert.equal(record.consented_at, "2026-11-17T01:00:00.000Z");
  assert.deepEqual(record.enabled_categories, ["pengumuman", "sekolah-sabat"]);
  assert.equal("pengumuman" in record, false, "the audit record must not copy per-category flags");
});

test("a consent record with nothing enabled is rejected, not stored", async () => {
  const { buildConsentRecord, emptyPreferences } = await load();
  assert.throws(
    () => buildConsentRecord(emptyPreferences(), new Date("2026-11-17T01:00:00.000Z")),
    /kategori/i,
    "stop-all must not be recorded as a consent grant",
  );
});

test("the module never stores an email or phone number", () => {
  const source = readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /\bemail\b/i, "no email field may be introduced");
  assert.doesNotMatch(source, /\b(phone|whatsapp|nomor)\b/i, "no phone field may be introduced");
});
