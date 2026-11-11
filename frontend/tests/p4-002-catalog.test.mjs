import test from "node:test";
import assert from "node:assert/strict";

import { selectSabbathCatalog } from "../src/lib/sabbath/catalog.mjs";
const entry = (classId, lang = "id") => ({ classId, payload: {
  quarterly: { id: "2026-01", index: "id-2026-01", lang, title: "Contoh sintetis",
    cover: "https://sabbath-school.adventech.io/synthetic-cover.jpg",
    credits: [{ name: "Sumber", value: "Penerbit sintetis" }] },
  lessons: [{ id: "01", index: "id-2026-01-01", title: "Contoh pelajaran" }],
} });

test("catalog selects valid Indonesian classes in editorial order", () => {
  assert.equal(typeof selectSabbathCatalog, "function");
  const result = selectSabbathCatalog(["adult", "cornerstone", "primary", "powerpoint", "kindergarten"].map((id) => entry(id)));
  assert.deepEqual(result.map(({ classId, label }) => [classId, label]), [
    ["kindergarten", "Kindergarten"], ["primary", "Primary"], ["powerpoint", "PowerPoint"],
    ["cornerstone", "Cornerstone"], ["adult", "Dewasa"],
  ]);
  assert.equal(result[0].quarterly.language, "id");
  assert.deepEqual(result[0].quarterly.credits, [{ name: "Sumber", value: "Penerbit sintetis" }]);
});

test("missing or invalid children classes leave only valid adult material", () => {
  const result = selectSabbathCatalog([entry("kindergarten", "en"), { classId: "primary", payload: {} },
    entry("unknown"), null, entry("adult")]);
  assert.deepEqual(result.map((item) => item.label), ["Dewasa"]);
});

test("invalid adult never becomes an invented fallback", () => {
  assert.deepEqual(selectSabbathCatalog([entry("adult", "en")]), []);
  assert.deepEqual(selectSabbathCatalog([entry("primary"), entry("adult", "en")]).map((item) => item.label), ["Primary"]);
  for (const input of [undefined, null, {}, "id", []]) assert.deepEqual(selectSabbathCatalog(input), []);
});

test("ambiguous duplicate classes are omitted without hiding unrelated classes", () => {
  assert.deepEqual(selectSabbathCatalog([entry("primary"), entry("adult"), entry("primary")])
    .map((item) => item.label), ["Dewasa"]);
});
