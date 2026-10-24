// frontend/tests/p3-003-course-import-parser.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { parseCourseImport, CourseImportError, MAX_IMPORT_BYTES } from "../src/lib/courses/imports.mjs";

export const validImport = () => ({
  format: "rinegetan-course-import/1",
  language: "id",
  source: { name: "Pelayanan Contoh", url: "https://contoh.invalid/seri", rights_holder: "Pemegang Contoh" },
  license: { name: "Izin tertulis contoh", url: "https://contoh.invalid/izin", notes: "Untuk jemaat lokal." },
  course: { title: "Seri Contoh", slug: "seri-contoh", summary: "Ringkasan seri." },
  lessons: [
    { position: 1, title: "Pelajaran Satu", slug: "pelajaran-satu", summary: "", body: "Paragraf satu.\r\n\r\nParagraf dua." },
    { position: 2, title: "Pelajaran Dua", slug: "pelajaran-dua", summary: "Ringkas", body: "Isi." },
  ],
});
const raw = (value) => JSON.stringify(value);
function rejects(value, pattern, status = 400) {
  assert.throws(() => parseCourseImport(typeof value === "string" ? value : raw(value)), (error) =>
    error instanceof CourseImportError && error.status === status && pattern.test(error.message));
}

test("valid import is normalized", () => {
  const data = validImport();
  data.course.title = "  Seri Contoh  ";
  data.source.url = "";
  const parsed = parseCourseImport(raw(data));
  assert.equal(parsed.course.title, "Seri Contoh");
  assert.equal(parsed.source.url, null);
  assert.equal(parsed.lessons[0].body, "Paragraf satu.\n\nParagraf dua.");
  assert.equal(parsed.license.notes, "Untuk jemaat lokal.");
});
test("size, JSON and top-level structure", () => {
  rejects("x".repeat(MAX_IMPORT_BYTES + 1), /2 MB/, 413);
  rejects("{", /JSON/);
  rejects([], /objek/);
  rejects({ ...validImport(), extra: true }, /extra/);
  rejects({ ...validImport(), format: "lain/1" }, /format/);
  rejects({ ...validImport(), language: "en" }, /language/);
});
test("text, slug and position limits", () => {
  const cases = [
    [(d) => { d.course.title = ""; }, /course\.title/],
    [(d) => { d.course.title = "a".repeat(201); }, /course\.title/],
    [(d) => { d.course.slug = "Bukan Slug"; }, /course\.slug/],
    [(d) => { d.course.summary = "a".repeat(501); }, /course\.summary/],
    [(d) => { d.lessons[0].body = "   "; }, /lessons\[0\]\.body/],
    [(d) => { d.lessons[0].body = "a".repeat(50001); }, /lessons\[0\]\.body/],
    [(d) => { d.lessons[1].position = 0; }, /lessons\[1\]\.position/],
    [(d) => { d.lessons[1].position = 1.5; }, /lessons\[1\]\.position/],
    [(d) => { d.lessons[0].title = "a\u0000"; }, /lessons\[0\]\.title/],
    [(d) => { d.lessons[0].extra = 1; }, /extra/],
  ];
  for (const [mutate, pattern] of cases) { const d = validImport(); mutate(d); rejects(d, pattern); }
});
test("lesson count and in-file duplicates", () => {
  rejects({ ...validImport(), lessons: [] }, /1–100/);
  const many = validImport();
  many.lessons = Array.from({ length: 101 }, (_, i) => ({ position: i + 1, title: `L${i}`, slug: `l-${i}`, summary: "", body: "Isi." }));
  rejects(many, /1–100/);
  const slug = validImport(); slug.lessons[1].slug = "pelajaran-satu"; rejects(slug, /lessons\[1\]\.slug.*dipakai/);
  const pos = validImport(); pos.lessons[1].position = 1; rejects(pos, /lessons\[1\]\.position.*dipakai/);
});
test("source, license and URL rules", () => {
  const cases = [
    [(d) => { d.source.name = ""; }, /source\.name/],
    [(d) => { d.source.rights_holder = " "; }, /source\.rights_holder/],
    [(d) => { d.license.name = ""; }, /license\.name/],
    [(d) => { d.license.notes = "a".repeat(1001); }, /license\.notes/],
    [(d) => { d.source.url = "http://contoh.invalid"; }, /source\.url/],
    [(d) => { d.license.url = "https://user:pass@contoh.invalid"; }, /license\.url/],
    [(d) => { d.source.url = `https://contoh.invalid/${"a".repeat(2040)}`; }, /source\.url/],
    [(d) => { d.source.url = "bukan url"; }, /source\.url/],
  ];
  for (const [mutate, pattern] of cases) { const d = validImport(); mutate(d); rejects(d, pattern); }
});
test("boundary values are accepted", () => {
  const d = validImport();
  d.course.title = "📖".repeat(200);
  d.course.summary = "a".repeat(500);
  d.license.notes = "a".repeat(1000);
  d.lessons[0].body = "a".repeat(50000);
  d.lessons[1].position = 2147483647;
  assert.equal(parseCourseImport(raw(d)).course.title.length, 400);
  const many = validImport();
  many.lessons = Array.from({ length: 100 }, (_, i) => ({ position: i + 1, title: `L${i}`, slug: `l-${i}`, summary: "", body: "Isi." }));
  assert.equal(parseCourseImport(raw(many)).lessons.length, 100);
});
test("413 counts bytes, not characters", () => {
  const s = "é".repeat(MAX_IMPORT_BYTES / 2 + 1);
  assert.ok(s.length < MAX_IMPORT_BYTES);
  rejects(s, /2 MB/, 413);
});
test("malformed URLs and text are rejected with the field path", () => {
  for (const bad of ["  https://a.b/x  ", "https://a.\nb/", "https://a.b/\u0000", "https:x", "https://a.b/\ud800", "https://a.b/\u007f", "https://a.b/ x"]) {
    const d = validImport(); d.source.url = bad; rejects(d, /source\.url/);
  }
  const d = validImport(); d.lessons[0].title = "x\ud800"; rejects(d, /lessons\[0\]\.title.*tidak diizinkan/);
  const p = validImport(); p.lessons[0].position = 0; rejects(p, /2\.147\.483\.647/);
});
test("non-string raw is a 400, not 413", () => {
  assert.throws(() => parseCourseImport(undefined), (e) => e instanceof CourseImportError && e.status === 400 && /JSON/.test(e.message));
});
