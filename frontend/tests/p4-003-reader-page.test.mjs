import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { tsxLoader } from "./helpers/load-tsx.mjs";

const quarter = { id: "2026-04", title: "Quarter", credits: [], lessons: [{ id: "07", title: "Lesson" }] };
const days = [{ id: "01", title: "First", date: "07/11/2026" }, { id: "02", title: "Second", date: "08/11/2026" }];
const snapshot = { status: "available", sourceUrl: "https://sabbath-school.adventech.io/in/2026-04/07/01", fetchedAt: "2026-11-11T00:00:00Z", data: { ...days[0], html: "<p>Reading &amp; meaning</p>" }, lesson: { id: "07", title: "Lesson", days } };
const root = "src/app/(public)/sekolah-sabat/[quarterId]";

function routes(result = snapshot) {
  const calls = [];
  const load = tsxLoader({
    "next/server": { connection: async () => { calls.push("connection"); } },
    "next/navigation": { notFound: () => { throw new Error("404"); } },
    "@/lib/sabbath/server": {
      loadSabbathCatalog: async () => { calls.push("catalog"); return { status: "available", classes: [{ classId: "adult", quarterly: quarter, ...snapshot }] }; },
      loadSabbathLesson: async (...args) => { calls.push(args); return result.status === "available" ? { ...result, data: snapshot.lesson } : result; },
      loadSabbathDay: async (...args) => { calls.push(args); return result; },
    },
  });
  return { load, calls };
}

test("quarter and lesson routes render anonymous internal lists after request boundary", async () => {
  const { load, calls } = routes();
  const quarterPage = load(`${root}/page.tsx`).default;
  const html = renderToStaticMarkup(await quarterPage({ params: Promise.resolve({ quarterId: "2026-04" }) }));
  assert.match(html, /href="\/sekolah-sabat\/2026-04\/07"/);
  assert.deepEqual(calls.slice(0, 2), ["connection", "catalog"]);
  const lessonPage = load(`${root}/[lessonId]/page.tsx`).default;
  const lessonHtml = renderToStaticMarkup(await lessonPage({ params: Promise.resolve({ quarterId: "2026-04", lessonId: "07" }) }));
  assert.match(lessonHtml, /href="\/sekolah-sabat\/2026-04\/07\/01"/);
  assert.match(lessonHtml, /07\/11\/2026/);
});

test("daily route renders sanitized content with next/back, attribution and fetched time", async () => {
  const { load, calls } = routes();
  const page = load(`${root}/[lessonId]/[dayId]/page.tsx`).default;
  const html = renderToStaticMarkup(await page({ params: Promise.resolve({ quarterId: "2026-04", lessonId: "07", dayId: "01" }) }));
  assert.match(html, /<p>Reading &amp; meaning<\/p>/);
  assert.match(html, /href="\/sekolah-sabat\/2026-04\/07\/02"/);
  assert.match(html, /Hari berikutnya/);
  assert.doesNotMatch(html, /Hari sebelumnya|Masuk|Unduh|download|localStorage/);
  assert.match(html, /Adventech/); assert.match(html, /dateTime="2026-11-11T00:00:00Z"/);
  assert.equal(calls[0], "connection");
});

test("reader outages remain readable with official fallback, while invalid or nonmember routes are 404", async () => {
  const params = Promise.resolve({ quarterId: "2026-04", lessonId: "07", dayId: "01" });
  const { load } = routes({ status: "unavailable" });
  const page = load(`${root}/[lessonId]/[dayId]/page.tsx`).default;
  const html = renderToStaticMarkup(await page({ params }));
  assert.match(html, /Materi belum tersedia/); assert.match(html, /https:\/\/sabbath-school.adventech.io\/in/);
  const missing = routes({ status: "not-found" }).load(`${root}/[lessonId]/[dayId]/page.tsx`).default;
  await assert.rejects(missing({ params }), /404/);
  const { load: invalidLoad, calls } = routes();
  await assert.rejects(invalidLoad(`${root}/page.tsx`).default({ params: Promise.resolve({ quarterId: "evil" }) }), /404/);
  assert.ok(!calls.includes("catalog"));
});
