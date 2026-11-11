import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuarterly } from "../src/lib/sabbath/adventech.mjs";
import * as catalog from "../src/lib/sabbath/catalog.mjs";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as core from "../src/lib/sabbath/adventech.mjs";

const liveFixture = () => ({ quarterly: { id: "2026-04", index: "in-2026-04", lang: "in",
  title: "Judul sintetis", start_date: "26/09/2026", end_date: "25/12/2026", human_date: "Oktober–Desember 2026",
  cover: "https://sabbath-school.adventech.io/api/v2/in/quarterlies/2026-04/cover.png" },
  lessons: [{ id: "01", index: "in-2026-04-01", title: "Pelajaran sintetis" }] });

test("real Indonesian source identity is preserved without invented publisher credits", () => {
  const result = normalizeQuarterly(liveFixture());
  assert.equal(result.language, "id");
  assert.equal(result.index, "in-2026-04");
  assert.deepEqual(result.credits, []);
});

function server(fetcher) {
  const source = readFileSync(new URL("../src/lib/sabbath/server.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source + "\nexport { fetchCatalog };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", "fetch", compiled)((id) => {
    if (id === "server-only") return {};
    if (id === "next/cache") return { unstable_cache: (fn) => fn };
    if (id === "./adventech.mjs") return core;
    if (id === "./catalog.mjs") return catalog;
    if (id === "@/lib/supabase/server") return { createServerSupabaseClient: () => { throw new Error("staff connection forbidden"); } };
    throw new Error(`Unexpected import ${id}`);
  }, exports, fetcher);
  return exports;
}
const json = (value) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json", etag: '"v1"' } });

test("server publishes verified active adult metadata with source version and attribution", async () => {
  const requests = [];
  const api = server(async (url) => {
    requests.push(url);
    return json(url.endsWith("/2026-04/index.json") ? liveFixture() : [liveFixture().quarterly]);
  });
  const result = await api.fetchCatalog("2026-11-10");
  assert.equal(result.status, "available");
  assert.equal(result.classes.length, 1);
  assert.equal(result.classes[0].label, "Dewasa");
  assert.equal(result.classes[0].quarterly.index, "in-2026-04");
  assert.equal(result.classes[0].sourceUrl, "https://sabbath-school.adventech.io/in/2026-04");
  assert.equal(result.classes[0].sourceVersion, '"v1"');
  assert.ok(Number.isFinite(Date.parse(result.classes[0].fetchedAt)));
  assert.deepEqual(requests, ["https://sabbath-school.adventech.io/api/v2/in/quarterlies/index.json",
    "https://sabbath-school.adventech.io/api/v2/in/quarterlies/2026-04/index.json"]);
});

test("failed or mismatched source never becomes a successful cached catalog", async () => {
  for (const bad of [
    () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } }),
    () => new Response("{}", { status: 302, headers: { location: "https://example.invalid" } }),
    () => json({ ...liveFixture(), quarterly: { ...liveFixture().quarterly, index: "in-2026-03" } }),
    () => json({ ...liveFixture(), quarterly: { ...liveFixture().quarterly, end_date: "26/12/2026" } }),
    () => new Response("x".repeat(2_097_153), { headers: { "content-type": "application/json", etag: '"v1"' } }),
    () => new Response("not json", { headers: { "content-type": "application/json", etag: '"v1"' } }),
  ]) {
    const api = server(async (url) => url.endsWith("/2026-04/index.json") ? bad() : json([liveFixture().quarterly]));
    await assert.rejects(api.fetchCatalog("2026-11-10"));
  }
  assert.deepEqual(await server(async () => { throw new Error("offline"); }).loadSabbathCatalog(), { status: "unavailable", classes: [] });
});

test("live metadata rejects cross-language identity, malformed attribution and unrelated lessons", () => {
  for (const change of [
    x => { x.quarterly.index = "id-2026-04"; }, x => { x.quarterly.lang = "en"; },
    x => { x.quarterly.credits = null; }, x => { x.quarterly.credits = [{ name: "Penerbit", value: "" }]; },
    x => { x.lessons[0].index = "en-2026-04-01"; }, x => { x.lessons.push({ ...x.lessons[0] }); },
  ]) { const x = liveFixture(); change(x); assert.throws(() => normalizeQuarterly(x)); }
});

test("active adult selection uses Makassar dates and never falls back to an old or future quarter", () => {
  assert.equal(typeof catalog.selectActiveAdultQuarter, "function");
  const q = liveFixture().quarterly;
  const select = (date, entries = [q]) => catalog.selectActiveAdultQuarter(entries, new Date(date));
  assert.equal(select("2026-09-25T15:59:59Z"), null);
  assert.equal(select("2026-09-25T16:00:00Z").id, "2026-04");
  assert.equal(select("2026-12-25T15:59:59Z").id, "2026-04");
  assert.equal(select("2026-12-25T16:00:00Z"), null);
  for (const entries of [[q, q], [{ ...q, lang: "en" }], [{ ...q, start_date: "31/09/2026" }],
    [{ ...q, id: "2026-04-primary", index: "in-2026-04-primary" }], [{ ...q, quarterly_group: { name: "Children" } }]]) {
    assert.equal(select("2026-11-10T00:00:00Z", entries), null);
  }
});
