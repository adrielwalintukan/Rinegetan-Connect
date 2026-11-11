import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tsxLoader } from "./helpers/load-tsx.mjs";
import { selectSabbathCatalog } from "../src/lib/sabbath/catalog.mjs";

const load = tsxLoader();
const Page = load("src/components/pages/SekolahSabatPage.jsx").default;
const render = (catalog) => renderToStaticMarkup(React.createElement(Page, { catalog, initialSchedules: [] }));
const materialSection = (markup) => markup.match(/<section[^>]*aria-labelledby="ss-materials-title"[\s\S]*?<\/section>/)?.[0] || "";

test("closed catalog keeps local classes and separates unavailable materials without false actions", () => {
  const markup = render({ status: "unavailable", classes: [] });
  for (const name of ["Kelas Anak-Anak", "Kelas Remaja (Pathfinder)", "Kelas Pemuda", "Kelas Dewasa"])
    assert.ok(markup.includes(name));
  const section = materialSection(markup);
  assert.match(section, /Materi Sekolah Sabat/);
  assert.match(section, /Materi belum tersedia/);
  assert.doesNotMatch(section, /<img|<a |<button|role="tab/);
  assert.equal((markup.match(/<h1[ >]/g) || []).length, 1);
});

test("available synthetic catalog renders class order and escaped attribution without a reader", () => {
  const classes = selectSabbathCatalog(["adult", "primary"].map((classId) => ({ classId, payload: {
    quarterly: { id: "2026-01", index: "id-2026-01", lang: "id", title: "Judul <script>contoh</script>",
      cover: "https://sabbath-school.adventech.io/synthetic.jpg",
      credits: [{ name: "Penerbit", value: "Sumber <script>contoh</script>" }] },
    lessons: [{ id: "01", index: "id-2026-01-01", title: "Satu" }],
  } })));
  const section = materialSection(render({ status: "available", classes }));
  assert.ok(section.indexOf("Primary") >= 0);
  assert.ok(section.indexOf("Primary") < section.indexOf("Dewasa"));
  assert.match(section, /Penerbit/);
  assert.match(section, /Sumber &lt;script&gt;contoh&lt;\/script&gt;/);
  assert.doesNotMatch(section, /<script>|<img|<button|role="tab|Materi belum tersedia/);
});

test("verified live catalog shows period, source link and fetch time rather than a false internal reader", () => {
  const section = materialSection(render({ status: "available", classes: [{ classId: "adult", label: "Dewasa",
    quarterly: { id: "2026-04", title: "Judul nyata", credits: [], lessons: [{ id: "01" }] },
    period: "26/09/2026–25/12/2026", sourceUrl: "https://sabbath-school.adventech.io/in/2026-04",
    fetchedAt: "2026-11-10T00:00:00Z" }] }));
  assert.match(section, /26\/09\/2026–25\/12\/2026/);
  assert.match(section, /href="https:\/\/sabbath-school.adventech.io\/in\/2026-04"/);
  assert.match(section, /Buka materi di Adventech/);
  assert.match(section, /Sumber: Adventech/);
  assert.match(section, /datetime="2026-11-10T00:00:00Z"/i);
});

test("source outage does not claim permission is still pending", () => {
  const section = materialSection(render({ status: "unavailable", classes: [] }));
  assert.match(section, /Coba lagi/);
  assert.doesNotMatch(section, /izin penggunaannya|setelah sumber dan izin/);
});

test("closed gate never renders supplied material even if entries exist", () => {
  const section = materialSection(render({ status: "unavailable", classes: [{ label: "PRIVATE_SENTINEL" }] }));
  assert.match(section, /Materi belum tersedia/);
  assert.doesNotMatch(section, /PRIVATE_SENTINEL/);
});

test("public route consumes closed server catalog without staff or source access", async () => {
  let catalogs = 0;
  let connected = false;
  const route = tsxLoader({
    "next/server": { connection: async () => { connected = true; } },
    "server-only": {},
    "@/lib/supabase/server": { createServerSupabaseClient: async () => { throw new Error("must not connect"); } },
    "@/lib/public/queries": { getPublishedSchedules: async () => [], getSiteSectionMedia: async () => ({}) },
    "@/lib/sabbath/server": { loadSabbathCatalog: async () => { assert.equal(connected, true, "catalog date must be evaluated per request, not during ISR prerender"); catalogs++; return { status: "unavailable", classes: [] }; } },
  })("src/app/(public)/sekolah-sabat/page.tsx").default;
  const element = await route();
  assert.deepEqual(element.props.catalog, { status: "unavailable", classes: [] });
  assert.equal(catalogs, 1);
});
