# P3-003 Impor Course Pelajari Alkitab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** Editor/Admin mengunggah satu berkas JSON course ke staging `course_imports`; Admin menyetujui lisensi sehingga course + lesson Draft dibuat secara atomik, atau menolak dengan alasan.

**Architecture:** Parser murni (`lib/courses/imports.mjs`) memvalidasi berkas; database (`course_imports`, trigger, RLS, fungsi `approve_course_import` security definer) menegakkan aturan yang sama walau API dilewati. API staf tipis memakai client sesi. UI panel impor di tab Pelajari Alkitab memuat metadata, preview diambil per id.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3, Supabase (Postgres 17, RLS, pgTAP, CLI 2.122.0), Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-p3-003-course-import-design.md`

## Global Constraints

- Bahasa Indonesia untuk semua teks UI dan pesan error.
- Format `rinegetan-course-import/1`; `language` wajib `"id"`.
- Berkas maksimal 2 MB (2.097.152 byte); 1–100 lesson.
- Teks: judul 1–200, ringkasan ≤ 500, isi lesson 1–50.000 karakter (code point, normalisasi CRLF→LF dan trim seperti P3-001); slug `^[a-z0-9]+(?:-[a-z0-9]+)*$` ≤ 220; posisi 1–2.147.483.647.
- URL opsional: `https://` saja, ≤ 2.048 karakter, tanpa userinfo.
- `source.name`, `source.rights_holder`, `license.name` wajib 1–200; `license.notes` ≤ 1.000; alasan penolakan 1–500.
- Editor/Admin mengimpor; hanya Admin approve/reject; tidak ada delete; anon tanpa akses.
- Tanpa dependency baru; logika di `.mjs`, `.ts` hanya re-export.
- UI: 320–1440 px tanpa overflow, target sentuh ≥ 44 px (`min-h-11 min-w-11`), keyboard/fokus, teks dirender sebagai teks (bukan HTML).
- Migration baru aditif; migration lama tidak diubah.
- Commit tanpa atribusi AI; akhiri pesan dengan `Refs #46`.

---

## File Structure

| File | Tanggung jawab |
| --- | --- |
| Create `frontend/src/lib/courses/imports.mjs` | Parser + konstanta + `CourseImportError` |
| Create `frontend/src/lib/courses/imports.ts` | Re-export tipe/fungsi parser |
| Create `frontend/src/lib/courses/import-actions.mjs` | Operasi DB: upload, daftar metadata, payload, keputusan |
| Create `frontend/src/lib/courses/import-actions.ts` | Re-export |
| Modify `frontend/src/types/courses.ts` | Tipe `CourseImport`, `CourseImportPayload` |
| Create `supabase/migrations/20261025000000_p3_003_course_imports.sql` | Tabel, trigger, audit, RLS, fungsi approve |
| Create `supabase/tests/p3_003_course_imports.test.sql` | pgTAP |
| Create `frontend/src/app/api/staff/course-imports/route.ts` | POST upload |
| Create `frontend/src/app/api/staff/course-imports/[id]/route.ts` | GET payload, POST keputusan |
| Create `frontend/src/components/staff/CourseImportPanel.tsx` | Daftar impor, preview, tombol keputusan |
| Create `frontend/src/components/staff/CourseImportDialogs.tsx` | Dialog unggah dan dialog keputusan |
| Modify `frontend/src/components/staff/CourseManager.tsx` | Render panel saat daftar course |
| Modify `frontend/src/components/staff/StaffDashboard.tsx` | Teruskan props impor |
| Modify `frontend/src/app/staff/(protected)/page.tsx` | Muat metadata impor |
| Create `frontend/tests/p3-003-course-import-parser.test.mjs` | Unit parser |
| Create `frontend/tests/p3-003-course-import-route.test.mjs` | Route + actions |
| Create `frontend/tests/p3-003-course-import-ui.test.mjs` | Kontrak sumber UI |
| Modify `frontend/tests/visual/staff-courses.spec.ts` | Alur browser |
| Create `docs/04-delivery/templates/course-import-example.json` | Contoh sintetis |
| Modify docs (Task 7) | Operasi, data model, status, record |

---

### Task 1: Parser berkas impor

**Files:**
- Create: `frontend/src/lib/courses/imports.mjs`, `frontend/src/lib/courses/imports.ts`
- Modify: `frontend/src/types/courses.ts`
- Test: `frontend/tests/p3-003-course-import-parser.test.mjs`

**Interfaces:**
- Produces: `IMPORT_FORMAT`, `MAX_IMPORT_BYTES = 2097152`, `MAX_IMPORT_LESSONS = 100`, `class CourseImportError extends UserFacingError { status: number }`, `parseCourseImport(raw: string): CourseImportPayload`.
- `CourseImportPayload = { format, language: "id", source: { name, url: string|null, rights_holder }, license: { name, url: string|null, notes: string }, course: { title, slug, summary }, lessons: { position, title, slug, summary, body }[] }`.

**Acceptance Criteria:**
- Berkas valid menghasilkan payload ternormalisasi (trim, CRLF→LF, url kosong → null).
- Setiap pelanggaran aturan Global Constraints melempar `CourseImportError` 400 (ukuran 413) dengan pesan Indonesia yang menyebut path field.

- [ ] **Step 1: Tulis test gagal**

```js
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd frontend; node --test tests/p3-003-course-import-parser.test.mjs`
Expected: FAIL (modul `imports.mjs` tidak ada).

- [ ] **Step 3: Implementasi parser**

```js
// frontend/src/lib/courses/imports.mjs
import { UserFacingError } from "../api/errors.mjs";
import { courseTextLengthError } from "./mutations.mjs";

export const IMPORT_FORMAT = "rinegetan-course-import/1";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_LESSONS = 100;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CourseImportError extends UserFacingError {
  /** @param {string} message @param {number} [status] */
  constructor(message, status = 400) {
    super(message);
    this.name = "CourseImportError";
    this.status = status;
  }
}
/** @param {string} path @param {string} reason */
const fail = (path, reason) => new CourseImportError(`Berkas impor tidak valid: ${path} ${reason}.`);

/** @param {unknown} value @param {string} path @param {string[]} keys @returns {Record<string, unknown>} */
function object(value, path, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail(path, "harus berupa objek");
  const extra = Object.keys(value).find((key) => !keys.includes(key));
  if (extra) throw fail(`${path === "berkas" ? "" : `${path}.`}${extra}`, "tidak dikenal");
  return /** @type {Record<string, unknown>} */ (value);
}
/** Same normalization and code point limits as the course CMS.
 * @param {unknown} value @param {string} path @param {number} max @param {boolean} required */
function text(value, path, max, required) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw fail(path, "harus berupa teks");
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if (clean.includes("\0")) throw fail(path, "berisi karakter yang tidak diizinkan");
  if (required && !clean) throw fail(path, "wajib diisi");
  if (courseTextLengthError(clean, max, path)) throw fail(path, `maksimal ${max.toLocaleString("id-ID")} karakter`);
  return clean;
}
/** @param {unknown} value @param {string} path */
function slug(value, path) {
  const clean = text(value, path, 220, true);
  if (!slugPattern.test(clean)) throw fail(path, "hanya boleh huruf kecil, angka, dan tanda hubung");
  return clean;
}
/** @param {unknown} value @param {string} path @returns {string | null} */
function url(value, path) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw fail(path, "harus URL https maksimal 2.048 karakter");
  let parsed;
  try { parsed = new URL(value); } catch { throw fail(path, "bukan URL yang valid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw fail(path, "harus URL https tanpa nama pengguna atau kata sandi");
  return value;
}

/** Validate one staff-prepared course file; nothing is trusted or copied beyond the documented fields.
 * @param {string} raw
 * @returns {import('../../types/courses').CourseImportPayload}
 */
export function parseCourseImport(raw) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) {
    throw new CourseImportError("Berkas impor melebihi batas 2 MB.", 413);
  }
  let input;
  try { input = JSON.parse(raw); } catch { throw new CourseImportError("Berkas impor bukan JSON yang valid."); }
  const root = object(input, "berkas", ["format", "language", "source", "license", "course", "lessons"]);
  if (root.format !== IMPORT_FORMAT) throw fail("format", `harus "${IMPORT_FORMAT}"`);
  if (root.language !== "id") throw fail("language", 'harus "id" (Bahasa Indonesia)');
  const source = object(root.source, "source", ["name", "url", "rights_holder"]);
  const license = object(root.license, "license", ["name", "url", "notes"]);
  const course = object(root.course, "course", ["title", "slug", "summary"]);
  if (!Array.isArray(root.lessons) || root.lessons.length < 1 || root.lessons.length > MAX_IMPORT_LESSONS) {
    throw fail("lessons", `harus berisi 1–${MAX_IMPORT_LESSONS} lesson`);
  }
  const slugs = new Set(), positions = new Set();
  const lessons = root.lessons.map((value, index) => {
    const path = `lessons[${index}]`;
    const lesson = object(value, path, ["position", "title", "slug", "summary", "body"]);
    const position = lesson.position;
    if (typeof position !== "number" || !Number.isInteger(position) || position < 1 || position > 2147483647) {
      throw fail(`${path}.position`, "harus bilangan bulat 1 atau lebih");
    }
    const lessonSlug = slug(lesson.slug, `${path}.slug`);
    if (slugs.has(lessonSlug)) throw fail(`${path}.slug`, "sudah dipakai lesson lain dalam berkas");
    if (positions.has(position)) throw fail(`${path}.position`, "sudah dipakai lesson lain dalam berkas");
    slugs.add(lessonSlug); positions.add(position);
    return {
      position,
      title: text(lesson.title, `${path}.title`, 200, true),
      slug: lessonSlug,
      summary: text(lesson.summary, `${path}.summary`, 500, false),
      body: text(lesson.body, `${path}.body`, 50000, true),
    };
  });
  return {
    format: IMPORT_FORMAT,
    language: "id",
    source: { name: text(source.name, "source.name", 200, true), url: url(source.url, "source.url"), rights_holder: text(source.rights_holder, "source.rights_holder", 200, true) },
    license: { name: text(license.name, "license.name", 200, true), url: url(license.url, "license.url"), notes: text(license.notes, "license.notes", 1000, false) },
    course: { title: text(course.title, "course.title", 200, true), slug: slug(course.slug, "course.slug"), summary: text(course.summary, "course.summary", 500, false) },
    lessons,
  };
}
```

```ts
// frontend/src/lib/courses/imports.ts
export { parseCourseImport, CourseImportError, IMPORT_FORMAT, MAX_IMPORT_BYTES, MAX_IMPORT_LESSONS } from "./imports.mjs";
```

Tambahkan ke `frontend/src/types/courses.ts`:

```ts
export interface CourseImportPayload {
  format: "rinegetan-course-import/1";
  language: "id";
  source: { name: string; url: string | null; rights_holder: string };
  license: { name: string; url: string | null; notes: string };
  course: { title: string; slug: string; summary: string };
  lessons: { position: number; title: string; slug: string; summary: string; body: string }[];
}

export interface CourseImport {
  id: string;
  status: "pending" | "approved" | "rejected";
  course_title: string;
  course_slug: string;
  lesson_count: number;
  source_name: string;
  source_url: string | null;
  rights_holder: string;
  license_name: string;
  license_url: string | null;
  license_notes: string | null;
  created_by: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  course_id: string | null;
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd frontend; node --test tests/p3-003-course-import-parser.test.mjs`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/courses/imports.mjs frontend/src/lib/courses/imports.ts frontend/src/types/courses.ts frontend/tests/p3-003-course-import-parser.test.mjs
git commit -m "feat(courses): parser berkas impor course (P3-003)" -m "Refs #46"
```

---

### Task 2: Migration `course_imports` dan pgTAP

**Files:**
- Create: `supabase/migrations/20261025000000_p3_003_course_imports.sql`
- Test: `supabase/tests/p3_003_course_imports.test.sql`

**Interfaces:**
- Produces: tabel `public.course_imports` (kolom sesuai tipe `CourseImport` + `payload jsonb`), fungsi `public.approve_course_import(p_import_id uuid) returns uuid`, pesan error `course_import_slug_taken`, `course_import_transition_invalid`, `course_import_immutable`, `course_import_admin_only`, `course_import_not_found`, `course_import_not_pending`.

**Acceptance Criteria:**
- Semua kasus pgTAP di spec lulus; suite pgTAP lama tetap lulus.
- Insert langsung dengan status/metadata palsu dipaksa `pending`; FK `on delete set null` (hapus course/user) tetap berjalan.

- [ ] **Step 1: Tulis pgTAP gagal**

```sql
-- supabase/tests/p3_003_course_imports.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_table('public', 'course_imports', 'course_imports exists');

insert into auth.users (id, email) values
 ('81000000-0000-4000-8000-00000000000a', 'p3003-admin@example.invalid'),
 ('81000000-0000-4000-8000-00000000000e', 'p3003-editor@example.invalid'),
 ('81000000-0000-4000-8000-00000000000c', 'p3003-no-role@example.invalid'),
 ('81000000-0000-4000-8000-00000000000f', 'p3003-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('81000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('81000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('81000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('81000000-0000-4000-8000-00000000000a', 'admin'),
 ('81000000-0000-4000-8000-00000000000e', 'editor'),
 ('81000000-0000-4000-8000-00000000000f', 'admin');
insert into public.courses (id, title, slug) values ('82000000-0000-4000-8000-000000000001', 'Existing', 'existing-course');

create temporary table import_payload as select jsonb_build_object(
  'format', 'rinegetan-course-import/1', 'language', 'id',
  'source', jsonb_build_object('name', 'Sumber', 'url', null, 'rights_holder', 'Pemegang'),
  'license', jsonb_build_object('name', 'Izin', 'url', null, 'notes', ''),
  'course', jsonb_build_object('title', 'Seri Impor', 'slug', 'seri-impor', 'summary', 'Ringkas'),
  'lessons', jsonb_build_array(
    jsonb_build_object('position', 1, 'title', 'Satu', 'slug', 'satu', 'summary', '', 'body', 'Isi satu.', 'status', 'published'),
    jsonb_build_object('position', 2, 'title', 'Dua', 'slug', 'dua', 'summary', '', 'body', 'Isi dua.'))) as p;
grant select on import_payload to anon, authenticated;

-- anon: no access at all
set local role anon;
select throws_ok($$ select * from public.course_imports $$, '42501', null, 'anon cannot read imports');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', null, 'anon cannot approve');
reset role;

-- non-staff cannot read or insert
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000c', true);
select results_eq($$ select id from public.course_imports $$, array[]::uuid[], 'non-staff sees no imports');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$, '42501', null, 'non-staff cannot insert');

-- Editor inserts; forged lifecycle fields are overwritten
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000e', true);
insert into public.course_imports (id, status, payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name, created_by, reviewed_by, reviewed_at, review_note, course_id)
  select '83000000-0000-4000-8000-000000000001', 'approved', p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin',
    '81000000-0000-4000-8000-00000000000a', '81000000-0000-4000-8000-00000000000a', now(), 'palsu', '82000000-0000-4000-8000-000000000001' from import_payload;
select results_eq($$ select status, created_by, reviewed_by, review_note, course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('pending'::text, '81000000-0000-4000-8000-00000000000e'::uuid, null::uuid, null::text, null::uuid) $$, 'insert forced to pending with session creator');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$, '23505', null, 'pending slug is unique');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(p, '{course,slug}', '"existing-course"'), '{course,title}', '"Existing"'), 'Existing', 'existing-course', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23505', 'course_import_slug_taken', 'slug used by a course is rejected');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(p, '{course,slug}', '"lain"'), '{course,title}', '"Lain"'), 'Lain', 'lain', 3, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23514', null, 'lesson_count must match payload');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(jsonb_set(p, '{course,slug}', '"besar"'), '{course,title}', '"Besar"'), '{license,notes}', to_jsonb(repeat('a', 2100000))), 'Besar', 'besar', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23514', null, 'payload over 2 MB is rejected');
select results_eq($$ update public.course_imports set status = 'rejected', review_note = 'x' returning id $$, array[]::uuid[], 'Editor cannot reject');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', 'course_import_admin_only', 'Editor cannot approve');
select throws_ok($$ delete from public.course_imports $$, '42501', null, 'nobody can delete imports');

-- Inactive Admin cannot approve
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000f', true);
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', 'course_import_admin_only', 'inactive Admin cannot approve');

-- Admin: direct approve, payload edit and reject without note are refused
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ update public.course_imports set status = 'approved' where id = '83000000-0000-4000-8000-000000000001' $$, '42501', null, 'Admin cannot approve by direct update');
select throws_ok($$ update public.course_imports set status = 'rejected', review_note = 'x', license_name = 'Ubah' where id = '83000000-0000-4000-8000-000000000001' $$, '23514', 'course_import_immutable', 'license data is immutable');
select throws_ok($$ update public.course_imports set status = 'rejected' where id = '83000000-0000-4000-8000-000000000001' $$, '42501', null, 'reject requires a note');

-- Approve creates Draft course + lessons from allowed fields only
select lives_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, 'Admin approves');
select results_eq($$ select c.status::text, c.created_by, i.status, i.reviewed_by, i.course_id = c.id
  from public.course_imports i join public.courses c on c.slug = 'seri-impor' where i.id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('draft'::text, '81000000-0000-4000-8000-00000000000a'::uuid, 'approved'::text, '81000000-0000-4000-8000-00000000000a'::uuid, true) $$, 'approved import links a Draft course');
select results_eq($$ select l.position, l.status::text from public.course_lessons l join public.courses c on c.id = l.course_id where c.slug = 'seri-impor' order by l.position $$,
  $$ values (1, 'draft'::text), (2, 'draft'::text) $$, 'lessons are Draft even if payload says published');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '23514', 'course_import_not_pending', 'second approval is rejected');
select results_eq($$ select action from public.audit_logs where entity_type = 'course_imports' and entity_id = '83000000-0000-4000-8000-000000000001' order by occurred_at, action $$,
  $$ values ('course_import.approved'::text), ('course_import.created'::text) $$, 'import audit recorded');
select is((select count(*)::int from public.audit_logs where entity_type = 'course_imports' and changes ? 'payload'), 0, 'audit never stores payload');

-- Slug conflict at approval rolls everything back
reset role;
insert into public.course_imports (id, payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select '83000000-0000-4000-8000-000000000002', jsonb_set(jsonb_set(p, '{course,slug}', '"konflik"'), '{course,title}', '"Konflik"'), 'Konflik', 'konflik', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload;
insert into public.courses (title, slug) values ('Konflik CMS', 'konflik');
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000002') $$, '23505', null, 'slug conflict aborts approval');
select results_eq($$ select status from public.course_imports where id = '83000000-0000-4000-8000-000000000002' $$, $$ values ('pending'::text) $$, 'import stays pending after failed approval');
select lives_ok($$ update public.course_imports set status = 'rejected', review_note = 'Slug sudah dipakai' where id = '83000000-0000-4000-8000-000000000002' $$, 'Admin rejects with note');
select results_eq($$ select status, reviewed_by from public.course_imports where id = '83000000-0000-4000-8000-000000000002' $$,
  $$ values ('rejected'::text, '81000000-0000-4000-8000-00000000000a'::uuid) $$, 'reject records reviewer');

-- FK cleanup still works on decided imports
reset role;
delete from public.course_lessons where course_id = (select course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001');
delete from public.courses where slug = 'seri-impor';
select results_eq($$ select status, course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('approved'::text, null::uuid) $$, 'deleting the course clears course_id only');

select * from finish();
rollback;
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd frontend; npm run supabase -- start -x realtime,imgproxy,mailpit,studio,edge-runtime,logflare,vector,supavisor,postgres-meta > /dev/null; npm run supabase -- test db`
Expected: FAIL pada `course_imports exists`.

- [ ] **Step 3: Tulis migration**

```sql
-- supabase/migrations/20261025000000_p3_003_course_imports.sql
-- P3-003: staged course imports; Draft content is created only after Admin license approval.
create table public.course_imports (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 2097152
    and jsonb_typeof(payload->'course') = 'object'
    and jsonb_typeof(payload->'lessons') = 'array'
  ),
  course_title text not null check (char_length(course_title) between 1 and 200 and course_title = btrim(course_title)),
  course_slug text not null check (char_length(course_slug) between 1 and 220 and course_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  lesson_count integer not null check (lesson_count between 1 and 100),
  source_name text not null check (char_length(source_name) between 1 and 200 and source_name = btrim(source_name)),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https://')),
  rights_holder text not null check (char_length(rights_holder) between 1 and 200 and rights_holder = btrim(rights_holder)),
  license_name text not null check (char_length(license_name) between 1 and 200 and license_name = btrim(license_name)),
  license_url text check (license_url is null or (char_length(license_url) <= 2048 and license_url ~ '^https://')),
  license_notes text check (license_notes is null or char_length(license_notes) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or (char_length(review_note) between 1 and 500 and review_note = btrim(review_note))),
  course_id uuid references public.courses(id) on delete set null,
  constraint course_imports_lessons_match check (
    case when jsonb_typeof(payload->'lessons') = 'array' then jsonb_array_length(payload->'lessons') = lesson_count else false end
  ),
  constraint course_imports_course_match check (
    payload->'course'->>'slug' = course_slug and payload->'course'->>'title' = course_title
  ),
  constraint course_imports_review_state check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null and course_id is null)
    or (status = 'rejected' and reviewed_at is not null and review_note is not null and course_id is null)
    or (status = 'approved' and reviewed_at is not null and review_note is null)
  )
);
create unique index course_imports_pending_slug_idx on public.course_imports (course_slug) where status = 'pending';
create index course_imports_created_at_idx on public.course_imports (created_at desc);

-- SECURITY DEFINER reads courses for the slug check and missing FK targets during SET NULL cleanup.
create function private.prepare_course_import()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.courses where slug = new.course_slug) then
      raise unique_violation using message = 'course_import_slug_taken';
    end if;
    new.status := 'pending';
    new.created_by := auth.uid();
    new.created_at := now();
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.course_id := null;
    return new;
  end if;

  -- ON DELETE SET NULL of a removed user/course is the only change allowed after a decision.
  if (to_jsonb(new) - array['created_by', 'reviewed_by', 'course_id']) = (to_jsonb(old) - array['created_by', 'reviewed_by', 'course_id'])
    and (new.created_by is not distinct from old.created_by or (new.created_by is null and not exists (select 1 from auth.users where id = old.created_by)))
    and (new.reviewed_by is not distinct from old.reviewed_by or (new.reviewed_by is null and not exists (select 1 from auth.users where id = old.reviewed_by)))
    and (new.course_id is not distinct from old.course_id or (new.course_id is null and not exists (select 1 from public.courses where id = old.course_id)))
    and (new.created_by is distinct from old.created_by or new.reviewed_by is distinct from old.reviewed_by or new.course_id is distinct from old.course_id)
  then
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
    raise check_violation using message = 'course_import_transition_invalid';
  end if;
  if (to_jsonb(new) - array['status', 'reviewed_by', 'reviewed_at', 'review_note', 'course_id'])
    is distinct from (to_jsonb(old) - array['status', 'reviewed_by', 'reviewed_at', 'review_note', 'course_id']) then
    raise check_violation using message = 'course_import_immutable';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

create function private.record_course_import_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'course_import.created' else 'course_import.' || new.status end,
    'course_imports',
    new.id,
    jsonb_build_object(
      'course_title', new.course_title, 'course_slug', new.course_slug, 'lesson_count', new.lesson_count,
      'source_name', new.source_name, 'license_name', new.license_name, 'status', new.status, 'course_id', new.course_id
    ) || case when new.status = 'rejected' then jsonb_build_object('review_note', new.review_note) else '{}'::jsonb end
  );
  return new;
end;
$$;

revoke all on function private.prepare_course_import() from public, anon, authenticated;
revoke all on function private.record_course_import_audit() from public, anon, authenticated;
create trigger course_imports_prepare before insert or update on public.course_imports
for each row execute function private.prepare_course_import();
create trigger course_imports_audit after insert or update on public.course_imports
for each row execute function private.record_course_import_audit();

-- SECURITY DEFINER with an explicit Admin check; auth.uid() still comes from the session for course triggers.
create function public.approve_course_import(p_import_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_import public.course_imports;
  v_course_id uuid;
  v_lesson jsonb;
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'course_import_admin_only';
  end if;
  select * into v_import from public.course_imports where id = p_import_id for update;
  if not found then
    raise no_data_found using message = 'course_import_not_found';
  end if;
  if v_import.status <> 'pending' then
    raise check_violation using message = 'course_import_not_pending';
  end if;

  insert into public.courses (title, slug, summary, status)
  values (v_import.payload->'course'->>'title', v_import.payload->'course'->>'slug',
          coalesce(v_import.payload->'course'->>'summary', ''), 'draft')
  returning id into v_course_id;

  for v_lesson in select value from jsonb_array_elements(v_import.payload->'lessons') loop
    insert into public.course_lessons (course_id, title, slug, summary, body, position, status)
    values (v_course_id, v_lesson->>'title', v_lesson->>'slug', coalesce(v_lesson->>'summary', ''),
            v_lesson->>'body', (v_lesson->>'position')::integer, 'draft');
  end loop;

  update public.course_imports set status = 'approved', course_id = v_course_id where id = p_import_id;
  return v_course_id;
end;
$$;
revoke all on function public.approve_course_import(uuid) from public, anon;
grant execute on function public.approve_course_import(uuid) to authenticated;

revoke all on table public.course_imports from public, anon, authenticated;
grant select, insert, update on table public.course_imports to authenticated;
alter table public.course_imports enable row level security;

create policy course_imports_select on public.course_imports for select to authenticated
using ((select private.is_editor_or_admin()));
create policy course_imports_insert on public.course_imports for insert to authenticated
with check ((select private.is_editor_or_admin()));
-- Approval goes only through approve_course_import(); direct updates may only reject.
create policy course_imports_reject_admin on public.course_imports for update to authenticated
using ((select private.is_admin()) and status = 'pending')
with check ((select private.is_admin()) and status = 'rejected' and course_id is null and review_note is not null);
```

- [ ] **Step 4: Jalankan pgTAP, pastikan lulus**

Run: `cd frontend; npm run supabase -- db reset > /dev/null; npm run supabase -- test db`
Expected: semua file lulus, termasuk `p3_003_course_imports.test.sql`. Bila `anon cannot approve` gagal karena fungsi tidak terlihat (42883), sesuaikan kode yang diharapkan ke `42501` dengan grant yang benar, bukan melonggarkan grant.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261025000000_p3_003_course_imports.sql supabase/tests/p3_003_course_imports.test.sql
git commit -m "feat(db): staging course_imports dan persetujuan lisensi Admin (P3-003)" -m "Refs #46"
```

---

### Task 3: Operasi DB dan API staf

**Files:**
- Create: `frontend/src/lib/courses/import-actions.mjs`, `frontend/src/lib/courses/import-actions.ts`
- Create: `frontend/src/app/api/staff/course-imports/route.ts`, `frontend/src/app/api/staff/course-imports/[id]/route.ts`
- Test: `frontend/tests/p3-003-course-import-route.test.mjs`

**Interfaces:**
- Consumes: `parseCourseImport`, `CourseImportError` (Task 1); tabel/fungsi Task 2.
- Produces:
  - `IMPORT_LIST_COLUMNS` (string kolom tanpa payload)
  - `createCourseImport(client, payload, role): Promise<CourseImport>`
  - `loadCourseImports(client): Promise<{ data: CourseImport[] | null, error: boolean }>` (maks 50, pending dulu lalu terbaru)
  - `loadCourseImportPayload(client, id): Promise<CourseImportPayload>`
  - `parseCourseImportDecision(value): { action: "approve" } | { action: "reject", note: string }`
  - `decideCourseImport(client, id, decision, role): Promise<{ id: string, course_id?: string }>`
  - API: `POST /api/staff/course-imports` (body = isi berkas mentah) → `{ success: true, data: CourseImport }`; `GET /api/staff/course-imports/[id]` → `{ success: true, data: CourseImportPayload }`; `POST /api/staff/course-imports/[id]` body `{ action, note? }` → `{ success: true, data }`.

**Acceptance Criteria:**
- Sesi tidak ada/kadaluarsa 401, staf tidak aktif/bukan staf 403, tanpa query mutasi.
- Editor approve/reject 403 sebelum query; berkas tidak valid 400/413 sebelum query; slug bentrok 409; id bukan UUID 400.
- Error database tidak bocor ke respons.

- [ ] **Step 1: Tulis test gagal**

```js
// frontend/tests/p3-003-course-import-route.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { validImport } from "./p3-003-course-import-parser.test.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const guardUrl = dataUrl(ts.transpileModule(readFileSync(new URL("../src/lib/staff/server.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const boundaryUrl = dataUrl('export async function createServerSupabaseClient() { return globalThis[Symbol.for("p3-import-client")]; }');
const modules = {
  "@/lib/supabase/server": boundaryUrl,
  "@/lib/staff/server": guardUrl,
  "@/lib/courses/imports": new URL("../src/lib/courses/imports.mjs", import.meta.url).href,
  "@/lib/courses/import-actions": new URL("../src/lib/courses/import-actions.mjs", import.meta.url).href,
  "@/lib/api/errors": new URL("../src/lib/api/errors.mjs", import.meta.url).href,
};
const upload = await loadTypeScript("src/app/api/staff/course-imports/route.ts", modules);
const item = await loadTypeScript("src/app/api/staff/course-imports/[id]/route.ts", modules);

// Only the Supabase network boundary is replaced.
function clientFor(result = {}, auth = {}) {
  const calls = [];
  const chain = {
    insert(v) { calls.push(["insert", v]); return this; }, update(v) { calls.push(["update", v]); return this; },
    eq(k, v) { calls.push(["eq", k, v]); return this; }, select(c) { calls.push(["select", c]); return this; },
    order(k, o) { calls.push(["order", k, o]); return this; }, limit(n) { calls.push(["limit", n]); return this; },
    async single() { calls.push(["single"]); return { data: null, error: null, ...result }; },
  };
  return {
    calls,
    auth: { async getUser() { return { data: { user: auth.user === null ? null : { id } }, error: null }; } },
    async rpc(name, args) { calls.push(["rpc", name, args]); return { data: null, error: null, ...result }; },
    from(table) {
      if (table === "staff_roles" || table === "profiles") return { select() { return this; }, eq() { return this; }, async maybeSingle() {
        return { data: table === "staff_roles" ? { role: auth.role ?? "admin" } : { is_active: auth.active ?? true }, error: null };
      } };
      calls.push(["from", table]); return chain;
    },
  };
}
async function call(handler, { body, raw = false, result, auth, params } = {}) {
  const client = clientFor(result, auth);
  globalThis[Symbol.for("p3-import-client")] = client;
  const init = body === undefined ? { method: "GET" } : { method: "POST", body: raw ? body : JSON.stringify(body) };
  const response = await handler(new Request("http://localhost/api/staff/course-imports", init), params ? { params: Promise.resolve(params) } : undefined);
  return { response, json: await response.json(), client };
}

test("upload rejects invalid or oversized files before any query", async () => {
  for (const [body, status] of [["{", 400], [JSON.stringify({ ...validImport(), language: "en" }), 400], ["x".repeat(2 * 1024 * 1024 + 1), 413]]) {
    const { response, client } = await call(upload.POST, { body, raw: true });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
});
test("upload requires an active staff session", async () => {
  for (const [auth, status] of [[{ user: null }, 401], [{ active: false }, 403], [{ role: null }, 403]]) {
    const { response, client } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, auth });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
});
test("Editor upload inserts only documented columns as pending staging", async () => {
  const row = { id, status: "pending" };
  const { response, json, client } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, auth: { role: "editor" }, result: { data: row } });
  assert.equal(response.status, 200); assert.deepEqual(json, { success: true, data: row });
  const [, insert] = client.calls.find(([name]) => name === "insert");
  assert.deepEqual(Object.keys(insert).sort(), ["course_slug", "course_title", "lesson_count", "license_name", "license_notes", "license_url", "payload", "rights_holder", "source_name", "source_url"]);
  assert.equal(insert.lesson_count, 2); assert.equal(insert.payload.lessons[0].body, "Paragraf satu.\n\nParagraf dua.");
});
test("slug conflict maps to 409 without leaking database text", async () => {
  const { response, json } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, result: { error: { code: "23505", message: "PRIVATE_SENTINEL" } } });
  assert.equal(response.status, 409); assert.ok(!JSON.stringify(json).includes("PRIVATE_SENTINEL"));
});
test("decisions are Admin-only and validated before any query", async () => {
  for (const [body, auth, status] of [[{ action: "approve" }, { role: "editor" }, 403], [{ action: "reject", note: "x" }, { role: "editor" }, 403], [{ action: "reject", note: " " }, {}, 400], [{ action: "publish" }, {}, 400]]) {
    const { response, client } = await call(item.POST, { body, auth, params: { id } });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
  const bad = await call(item.POST, { body: { action: "approve" }, params: { id: "broken" } });
  assert.equal(bad.response.status, 400); assert.deepEqual(bad.client.calls, []);
});
test("Admin approve calls the approval function; reject updates only pending rows", async () => {
  const approved = await call(item.POST, { body: { action: "approve" }, params: { id }, result: { data: "course-id" } });
  assert.equal(approved.response.status, 200); assert.deepEqual(approved.client.calls, [["rpc", "approve_course_import", { p_import_id: id }]]);
  assert.deepEqual(approved.json.data, { id, course_id: "course-id" });
  const rejected = await call(item.POST, { body: { action: "reject", note: "  Izin belum jelas  " }, params: { id }, result: { data: { id } } });
  assert.equal(rejected.response.status, 200);
  assert.deepEqual(rejected.client.calls.slice(0, 4), [["from", "course_imports"], ["update", { status: "rejected", review_note: "Izin belum jelas" }], ["eq", "id", id], ["eq", "status", "pending"]]);
});
test("GET preview returns payload for active staff only", async () => {
  const payload = validImport();
  const ok = await call(item.GET, { params: { id }, auth: { role: "editor" }, result: { data: { payload } } });
  assert.equal(ok.response.status, 200); assert.deepEqual(ok.json.data, payload);
  const denied = await call(item.GET, { params: { id }, auth: { user: null } });
  assert.equal(denied.response.status, 401); assert.deepEqual(denied.client.calls, []);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd frontend; node --test tests/p3-003-course-import-route.test.mjs`
Expected: FAIL (route belum ada).

- [ ] **Step 3: Implementasi actions dan route**

```js
// frontend/src/lib/courses/import-actions.mjs
import { CourseImportError } from "./imports.mjs";
import { publicErrorMessage } from "../api/errors.mjs";

export const IMPORT_LIST_COLUMNS = "id, status, course_title, course_slug, lesson_count, source_name, source_url, rights_holder, license_name, license_url, license_notes, created_by, created_at, reviewed_by, reviewed_at, review_note, course_id";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_MESSAGES = {
  course_import_slug_taken: ["Slug course sudah dipakai. Ubah slug di berkas lalu unggah ulang.", 409],
  course_import_not_pending: ["Impor ini sudah diputuskan sebelumnya. Muat ulang halaman.", 409],
  course_import_not_found: ["Impor tidak ditemukan.", 404],
  course_import_admin_only: ["Hanya Admin yang dapat menyetujui lisensi impor.", 403],
};

/** @param {unknown} error */
export function importFailure(error) {
  if (error instanceof CourseImportError) return error;
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const known = Object.entries(STATUS_MESSAGES).find(([key]) => message.includes(key));
  if (known) return new CourseImportError(known[1][0], known[1][1]);
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23505") return new CourseImportError("Slug course sudah dipakai course atau impor lain yang menunggu. Ubah slug lalu unggah ulang.", 409);
  const status = code === "PGRST116" ? 404 : code === "42501" ? 403 : ["23502", "23514", "22P02"].includes(code) ? 400 : 500;
  return new CourseImportError(publicErrorMessage(error), status);
}
/** @param {unknown} value */
export function importId(value) {
  if (typeof value !== "string" || !uuid.test(value)) throw new CourseImportError("Impor tidak valid.", 400);
  return value;
}
/** @param {'admin' | 'editor'} role */
function staffOnly(role) {
  if (role !== "admin" && role !== "editor") throw new CourseImportError("Hanya staf aktif yang dapat mengimpor materi.", 403);
}

/** Insert a validated file as pending staging; lifecycle columns are set by the database.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {import('../../types/courses').CourseImportPayload} payload
 * @param {'admin' | 'editor'} role
 */
export async function createCourseImport(client, payload, role) {
  staffOnly(role);
  const { data, error } = await client.from("course_imports").insert({
    payload,
    course_title: payload.course.title,
    course_slug: payload.course.slug,
    lesson_count: payload.lessons.length,
    source_name: payload.source.name,
    source_url: payload.source.url,
    rights_holder: payload.source.rights_holder,
    license_name: payload.license.name,
    license_url: payload.license.url,
    license_notes: payload.license.notes || null,
  }).select(IMPORT_LIST_COLUMNS).single();
  if (error || !data) throw importFailure(error);
  return data;
}

/** Metadata only (no payload), pending first then newest, at most 50 rows.
 * @param {import('@supabase/supabase-js').SupabaseClient} client */
export async function loadCourseImports(client) {
  try {
    const { data, error } = await client.from("course_imports").select(IMPORT_LIST_COLUMNS)
      .order("status", { ascending: false }).order("created_at", { ascending: false }).limit(50);
    return error || !data ? { data: null, error: true } : { data, error: false };
  } catch { return { data: null, error: true }; }
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} id */
export async function loadCourseImportPayload(client, id) {
  const { data, error } = await client.from("course_imports").select("payload").eq("id", importId(id)).single();
  if (error || !data) throw importFailure(error);
  return data.payload;
}

/** @param {unknown} value @returns {{ action: 'approve' } | { action: 'reject', note: string }} */
export function parseCourseImportDecision(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : {};
  if (input.action === "approve" && Object.keys(input).length === 1) return { action: "approve" };
  if (input.action === "reject" && Object.keys(input).every((key) => key === "action" || key === "note") && typeof input.note === "string") {
    const note = input.note.replace(/\r\n?/g, "\n").trim();
    if (note && Array.from(note).length <= 500 && !note.includes("\0")) return { action: "reject", note };
    throw new CourseImportError("Alasan penolakan wajib diisi, maksimal 500 karakter.", 400);
  }
  throw new CourseImportError("Keputusan impor tidak valid.", 400);
}

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} id
 * @param {{ action: 'approve' } | { action: 'reject', note: string }} decision @param {'admin' | 'editor'} role */
export async function decideCourseImport(client, id, decision, role) {
  if (role !== "admin") throw new CourseImportError("Hanya Admin yang dapat menyetujui atau menolak impor.", 403);
  if (decision.action === "approve") {
    const { data, error } = await client.rpc("approve_course_import", { p_import_id: id });
    if (error || !data) throw importFailure(error);
    return { id, course_id: data };
  }
  const { data, error } = await client.from("course_imports").update({ status: "rejected", review_note: decision.note })
    .eq("id", id).eq("status", "pending").select("id").single();
  if (error || !data) throw importFailure(error || { code: "PGRST116" });
  return { id: data.id };
}
```

```ts
// frontend/src/lib/courses/import-actions.ts
export { IMPORT_LIST_COLUMNS, createCourseImport, loadCourseImports, loadCourseImportPayload, parseCourseImportDecision, decideCourseImport, importFailure, importId } from "./import-actions.mjs";
```

```ts
// frontend/src/app/api/staff/course-imports/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { parseCourseImport, CourseImportError } from "@/lib/courses/imports";
import { createCourseImport, importFailure } from "@/lib/courses/import-actions";
import { publicErrorMessage } from "@/lib/api/errors";

export function staffError(error: StaffAccessError): Response {
  return Response.json(
    { error: error.code === "not_authenticated" ? "Sesi berakhir. Silakan masuk kembali." : "Hanya staf aktif yang dapat mengelola materi." },
    { status: error.code === "not_authenticated" ? 401 : 403 },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = parseCourseImport(await request.text());
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await createCourseImport(client, payload, staff.role) });
  } catch (error) {
    if (error instanceof StaffAccessError) return staffError(error);
    const failure = importFailure(error);
    return Response.json({ error: publicErrorMessage(failure) }, { status: failure instanceof CourseImportError ? failure.status : 500 });
  }
}
```

```ts
// frontend/src/app/api/staff/course-imports/[id]/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { CourseImportError } from "@/lib/courses/imports";
import { decideCourseImport, importFailure, importId, loadCourseImportPayload, parseCourseImportDecision } from "@/lib/courses/import-actions";
import { publicErrorMessage } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };
function failure(error: unknown): Response {
  if (error instanceof StaffAccessError) {
    return Response.json(
      { error: error.code === "not_authenticated" ? "Sesi berakhir. Silakan masuk kembali." : "Hanya staf aktif yang dapat mengelola materi." },
      { status: error.code === "not_authenticated" ? 401 : 403 },
    );
  }
  const mapped = importFailure(error);
  return Response.json({ error: publicErrorMessage(mapped) }, { status: mapped instanceof CourseImportError ? mapped.status : 500 });
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const id = importId((await context.params).id);
    const client = await createServerSupabaseClient();
    await requireActiveStaff(client);
    return Response.json({ success: true, data: await loadCourseImportPayload(client, id) });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const id = importId((await context.params).id);
    let input: unknown;
    try { input = await request.json(); } catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
    const decision = parseCourseImportDecision(input);
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await decideCourseImport(client, id, decision, staff.role) });
  } catch (error) { return failure(error); }
}
```

Catatan: Editor yang mengirim keputusan harus 403 sebelum query; urutan di atas memanggil `requireActiveStaff` lalu `decideCourseImport`, yang menolak non-Admin sebelum `rpc`/`update` (query `staff_roles`/`profiles` milik guard tidak dicatat di `calls`).

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd frontend; node --test tests/p3-003-course-import-route.test.mjs tests/p3-003-course-import-parser.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/courses/import-actions.mjs frontend/src/lib/courses/import-actions.ts frontend/src/app/api/staff/course-imports frontend/tests/p3-003-course-import-route.test.mjs
git commit -m "feat(api): unggah, preview, dan keputusan impor course (P3-003)" -m "Refs #46"
```

---

### Task 4: UI panel impor di portal staf

**Files:**
- Create: `frontend/src/components/staff/CourseImportPanel.tsx`, `frontend/src/components/staff/CourseImportDialogs.tsx`
- Modify: `frontend/src/components/staff/CourseManager.tsx` (props + render panel saat `!selected`)
- Modify: `frontend/src/components/staff/StaffDashboard.tsx` (props `initialCourseImports`, `courseImportsError`, teruskan `currentUserId`)
- Modify: `frontend/src/app/staff/(protected)/page.tsx` (tambah `loadCourseImports(client)` ke `Promise.all`)
- Test: `frontend/tests/p3-003-course-import-ui.test.mjs`

**Interfaces:**
- Consumes: API Task 3; tipe `CourseImport`, `CourseImportPayload`; `MAX_IMPORT_BYTES`.
- Produces: `<CourseImportPanel imports role currentUserId error onNotification />`; `<CourseImportUploadDialog isOpen onClose onUploaded />`; `<CourseImportDecisionDialog mode="approve"|"reject" isOpen title onClose onConfirm(note?) />`.

**Acceptance Criteria:**
- Editor/Admin melihat tombol **Impor JSON** dan daftar impor; Editor tidak melihat **Setujui**/**Tolak**.
- Preview dimuat saat **Lihat preview** diklik dan dirender sebagai teks berparagraf.
- Label "Diunggah dan disetujui oleh orang yang sama" tampil bila `created_by === reviewed_by` pada impor approved.
- Tombol `min-h-11 min-w-11`, dialog menjebak fokus seperti dialog course, tidak ada overflow pada 320 px.

- [ ] **Step 1: Tulis test kontrak UI gagal**

```js
// frontend/tests/p3-003-course-import-ui.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("import panel exposes upload, preview and Admin-only decisions", () => {
  const panel = read("components/staff/CourseImportPanel.tsx");
  for (const text of ["Impor JSON", "Lihat preview", "Setujui", "Tolak", "Diunggah dan disetujui oleh orang yang sama", "/api/staff/course-imports"]) assert.ok(panel.includes(text), text);
  assert.match(panel, /role === "admin" && item\.status === "pending"/);
  assert.ok(!panel.includes("dangerouslySetInnerHTML"));
});
test("dialogs reuse the shared modal and keep 44px targets", () => {
  const dialogs = read("components/staff/CourseImportDialogs.tsx");
  assert.match(dialogs, /from "@\/components\/ui\/modal"/);
  assert.match(dialogs, /MAX_IMPORT_BYTES/);
  assert.match(dialogs, /min-h-11/);
  assert.match(dialogs, /Alasan penolakan/);
});
test("staff page loads import metadata, never payloads, for the course tab", () => {
  const page = read("app/staff/(protected)/page.tsx");
  assert.match(page, /loadCourseImports\(client\)/);
  assert.match(read("components/staff/CourseManager.tsx"), /<CourseImportPanel/);
  assert.ok(!read("lib/courses/import-actions.mjs").match(/IMPORT_LIST_COLUMNS = "[^"]*payload/));
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd frontend; node --test tests/p3-003-course-import-ui.test.mjs`
Expected: FAIL (berkas belum ada).

- [ ] **Step 3: Implementasi dialog**

```tsx
// frontend/src/components/staff/CourseImportDialogs.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";
import { clientErrorMessage } from "@/lib/api/errors";
import { MAX_IMPORT_BYTES } from "@/lib/courses/imports";

const button = "min-h-11 min-w-11 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";
const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-slate-100";

/** Focus the first control on open, trap Tab inside, restore focus on close — same contract as CourseMutationDialog. */
function useDialogFocus(isOpen: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input, textarea, button")?.focus(), 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)") ?? []);
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
  };
  return { panel, onKeyDown };
}

export function CourseImportUploadDialog({ isOpen, onClose, onUploaded }: { isOpen: boolean; onClose: () => void; onUploaded: () => void }) {
  const { panel, onKeyDown } = useDialogFocus(isOpen);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!file) { setError("Pilih berkas JSON terlebih dahulu."); return; }
    if (file.size > MAX_IMPORT_BYTES) { setError("Berkas impor melebihi batas 2 MB."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/staff/course-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Gagal mengunggah berkas impor.");
      onUploaded();
    } catch (err) { setError(clientErrorMessage(err, "Gagal mengunggah berkas impor.")); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} className={MODAL_BACKDROP} labelledBy="course-import-title">
    <div ref={panel} tabIndex={-1} onKeyDown={onKeyDown} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6">
      <h2 id="course-import-title" className="text-lg font-bold text-navy">Impor course dari JSON</h2>
      <p className="mt-2 text-sm text-slate-600">Berkas satu course berformat <code>rinegetan-course-import/1</code>, maksimal 2 MB dan 100 lesson. Hasil impor menunggu persetujuan lisensi Admin dan dibuat sebagai Draft.</p>
      {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Berkas JSON<input type="file" accept="application/json,.json" disabled={busy} className={field} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-slate-300`}>Batal</button>
          <button type="submit" disabled={busy} className={`${button} bg-navy text-white`}>{busy ? "Mengunggah..." : "Unggah untuk ditinjau"}</button>
        </div>
      </form>
    </div>
  </Modal>;
}

export function CourseImportDecisionDialog({ mode, isOpen, title, onClose, onConfirm }: {
  mode: "approve" | "reject"; isOpen: boolean; title: string; onClose: () => void; onConfirm: (note?: string) => Promise<void>;
}) {
  const { panel, onKeyDown } = useDialogFocus(isOpen);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === "reject" && !note.trim()) { setError("Alasan penolakan wajib diisi."); return; }
    setBusy(true); setError(null);
    try { await onConfirm(mode === "reject" ? note : undefined); }
    catch (err) { setError(clientErrorMessage(err, "Gagal menyimpan keputusan impor.")); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} className={MODAL_BACKDROP} labelledBy="course-import-decision-title">
    <div ref={panel} tabIndex={-1} onKeyDown={onKeyDown} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6">
      <h2 id="course-import-decision-title" className="break-words text-lg font-bold text-navy">{mode === "approve" ? "Setujui lisensi impor" : "Tolak impor"}: {title}</h2>
      <p className="mt-2 text-sm text-slate-600">{mode === "approve"
        ? "Pastikan sumber dan izin pakai sudah diperiksa. Course dan semua lesson akan dibuat sebagai Draft; terbitkan lewat pengelola course."
        : "Impor tidak akan dibuat menjadi course. Editor dapat mengunggah ulang berkas yang sudah diperbaiki."}</p>
      {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={confirm} className="mt-4 space-y-4">
        {mode === "reject" && <label className="block text-sm font-semibold text-slate-700">Alasan penolakan<textarea value={note} maxLength={500} rows={3} disabled={busy} onChange={event => setNote(event.target.value)} className={field} /></label>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-slate-300`}>Batal</button>
          <button type="submit" disabled={busy} className={`${button} ${mode === "approve" ? "bg-navy" : "bg-red-600"} text-white`}>{busy ? "Menyimpan..." : mode === "approve" ? "Setujui dan buat Draft" : "Tolak impor"}</button>
        </div>
      </form>
    </div>
  </Modal>;
}
```

Catatan: periksa `ModalDialog` memakai prop `labelledBy` (dipakai `CourseMutationDialog`); bila pemakaian Modal di repo menutup dengan Escape lewat `onClose`, perilaku itu ikut berlaku.

- [ ] **Step 4: Implementasi panel**

```tsx
// frontend/src/components/staff/CourseImportPanel.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { clientErrorMessage } from "@/lib/api/errors";
import { CourseImportUploadDialog, CourseImportDecisionDialog } from "./CourseImportDialogs";
import type { CourseImport, CourseImportPayload } from "@/types/courses";

const button = "min-h-11 min-w-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";
const STATUS = { pending: ["Menunggu persetujuan", "bg-amber-50 text-amber-900"], approved: ["Disetujui", "bg-emerald-50 text-emerald-900"], rejected: ["Ditolak", "bg-red-50 text-red-800"] } as const;
const paragraphs = (text: string) => text.split(/\n[\t ]*\n/).filter(part => part.trim());

interface Props {
  imports: CourseImport[];
  role: "admin" | "editor";
  currentUserId: string;
  error?: string | null;
  onNotification: (type: "success" | "error", message: string) => void;
}

export function CourseImportPanel({ imports, role, error, onNotification }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [decision, setDecision] = useState<{ mode: "approve" | "reject"; item: CourseImport } | null>(null);
  const [previews, setPreviews] = useState<Record<string, CourseImportPayload | "loading" | "error">>({});
  const togglePreview = async (item: CourseImport) => {
    if (previews[item.id] && previews[item.id] !== "error") { setPreviews(({ [item.id]: _removed, ...rest }) => rest); return; }
    setPreviews(prev => ({ ...prev, [item.id]: "loading" }));
    try {
      const res = await fetch(`/api/staff/course-imports/${item.id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Preview gagal dimuat.");
      setPreviews(prev => ({ ...prev, [item.id]: json.data as CourseImportPayload }));
    } catch (err) {
      setPreviews(prev => ({ ...prev, [item.id]: "error" }));
      onNotification("error", clientErrorMessage(err, "Preview gagal dimuat."));
    }
  };
  const decide = async (note?: string) => {
    if (!decision) return;
    const res = await fetch(`/api/staff/course-imports/${decision.item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision.mode === "approve" ? { action: "approve" } : { action: "reject", note }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Gagal menyimpan keputusan impor.");
    onNotification("success", decision.mode === "approve" ? "Lisensi disetujui. Course dibuat sebagai Draft." : "Impor ditolak.");
    setDecision(null); router.refresh();
  };
  return <section aria-labelledby="course-import-heading" className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="course-import-heading" className="text-lg font-bold text-navy">Impor course</h2>
      <button type="button" className={`${button} bg-navy text-white`} onClick={() => setUploading(true)}>Impor JSON</button>
    </div>
    <p className="text-sm text-slate-600">Impor menunggu persetujuan lisensi Admin. Setelah disetujui, course dan lesson dibuat sebagai Draft.</p>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {imports.length === 0 ? <p className="text-sm text-slate-600">Belum ada impor.</p> : <ul className="space-y-3">{imports.map(item => {
      const preview = previews[item.id];
      const [label, tone] = STATUS[item.status];
      return <li key={item.id} className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold text-navy">{item.course_title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span></div>
        <p className="break-all text-xs text-slate-500">{item.course_slug} · {item.lesson_count} lesson</p>
        <dl className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <div className="min-w-0"><dt className="font-semibold">Sumber</dt><dd className="break-words">{item.source_name}{item.source_url ? ` (${item.source_url})` : ""}</dd></div>
          <div className="min-w-0"><dt className="font-semibold">Pemegang hak</dt><dd className="break-words">{item.rights_holder}</dd></div>
          <div className="min-w-0"><dt className="font-semibold">Lisensi/izin</dt><dd className="break-words">{item.license_name}{item.license_url ? ` (${item.license_url})` : ""}</dd></div>
          {item.license_notes && <div className="min-w-0"><dt className="font-semibold">Catatan izin</dt><dd className="whitespace-pre-wrap break-words">{item.license_notes}</dd></div>}
        </dl>
        {item.status === "rejected" && item.review_note && <p className="whitespace-pre-wrap break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">Alasan penolakan: {item.review_note}</p>}
        {item.status === "approved" && item.created_by && item.created_by === item.reviewed_by && <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700">Diunggah dan disetujui oleh orang yang sama.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-expanded={Boolean(preview && preview !== "error")} className={button} disabled={preview === "loading"} onClick={() => void togglePreview(item)}>{preview && preview !== "error" && preview !== "loading" ? "Tutup preview" : "Lihat preview"}</button>
          {role === "admin" && item.status === "pending" && <>
            <button type="button" className={`${button} bg-navy text-white`} onClick={() => setDecision({ mode: "approve", item })}>Setujui</button>
            <button type="button" className={`${button} text-red-700`} onClick={() => setDecision({ mode: "reject", item })}>Tolak</button>
          </>}
        </div>
        {preview && preview !== "loading" && preview !== "error" && <div className="space-y-3 border-t border-slate-200 pt-3">
          {preview.course.summary && <p className="whitespace-pre-line break-words text-sm text-slate-600">{preview.course.summary}</p>}
          <ol className="space-y-3">{preview.lessons.map(lesson => <li key={lesson.slug} className="min-w-0">
            <h4 className="break-words font-semibold text-navy">{lesson.position}. {lesson.title}</h4>
            {lesson.summary && <p className="whitespace-pre-line break-words text-sm text-slate-600">{lesson.summary}</p>}
            <div className="mt-1 space-y-2 text-sm text-slate-800">{paragraphs(lesson.body).map((part, i) => <p key={i} className="whitespace-pre-line break-words">{part}</p>)}</div>
          </li>)}</ol>
        </div>}
      </li>;
    })}</ul>}
    {uploading && <CourseImportUploadDialog isOpen onClose={() => setUploading(false)} onUploaded={() => { setUploading(false); onNotification("success", "Berkas diunggah dan menunggu persetujuan lisensi."); router.refresh(); }} />}
    {decision && <CourseImportDecisionDialog key={`${decision.mode}-${decision.item.id}`} mode={decision.mode} isOpen title={decision.item.course_title} onClose={() => setDecision(null)} onConfirm={decide} />}
  </section>;
}
```

- [ ] **Step 5: Sambungkan ke CourseManager, StaffDashboard, dan halaman staf**

`CourseManager.tsx`: tambah props `imports?: CourseImport[]; importsError?: string | null; currentUserId: string;`, import `CourseImportPanel` dan tipe `CourseImport`, lalu di dalam `<section>` tepat sebelum `<div className="flex flex-wrap items-center justify-between gap-3">` daftar course:

```tsx
{!selected && <CourseImportPanel imports={imports ?? []} role={role} currentUserId={currentUserId} error={importsError} onNotification={onNotification} />}
```

`StaffDashboard.tsx`: tambah props `initialCourseImports?: CourseImport[]; courseImportsError?: string | null;` (default `[]`) dan teruskan ke `<CourseManager ... imports={initialCourseImports} importsError={courseImportsError} currentUserId={currentUserId} />`.

`page.tsx`: import `loadCourseImports` dari `@/lib/courses/import-actions` dan tipe `CourseImport`; tambahkan `importsRes` sebagai elemen terakhir destrukturisasi dan `loadCourseImports(client)` sebagai elemen terakhir `Promise.all`; teruskan:

```tsx
initialCourseImports={(importsRes.data as CourseImport[]) || []}
courseImportsError={importsRes.error ? "Daftar impor gagal dimuat. Silakan coba muat ulang." : null}
```

- [ ] **Step 6: Jalankan test + typecheck + lint**

Run: `cd frontend; node --test tests/p3-003-course-import-ui.test.mjs tests/p3-001-course-ui.test.mjs; npm run typecheck; npm run lint`
Expected: PASS, 0 error/warning. Bila test kontrak P3-001 memeriksa jumlah props atau isi `CourseManager`, perbarui hanya bagian yang benar-benar berubah.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/staff/CourseImportPanel.tsx frontend/src/components/staff/CourseImportDialogs.tsx frontend/src/components/staff/CourseManager.tsx frontend/src/components/staff/StaffDashboard.tsx "frontend/src/app/staff/(protected)/page.tsx" frontend/tests/p3-003-course-import-ui.test.mjs
git commit -m "feat(staff): panel impor course dengan preview dan persetujuan lisensi (P3-003)" -m "Refs #46"
```

---

### Task 5: Regresi browser (Playwright)

**Files:**
- Modify: `frontend/tests/visual/staff-courses.spec.ts`

**Interfaces:**
- Consumes: fixture `local` (`login`, `execute`, `suffix`, `admin`, `editor`), helper `open`, `card`.

**Acceptance Criteria:**
- Editor mengunggah berkas sintetis, melihat status menunggu dan preview, tanpa tombol Setujui/Tolak.
- Admin menolak dengan alasan (wajib) dan menyetujui impor lain; course Draft muncul di daftar course dengan label persetujuan diri bila relevan.
- Anonim mendapat 404 untuk slug course hasil impor sebelum terbit; berkas tidak valid menampilkan pesan per field tanpa membuat baris.
- Pada lebar 320 px tidak ada overflow horizontal; dialog dapat dioperasikan dengan keyboard.
- Fixture membersihkan baris impor dan course buatan test.

- [ ] **Step 1: Tambahkan test**

```ts
// tambahkan di akhir frontend/tests/visual/staff-courses.spec.ts
const importFile = (suffix: string, slug: string) => ({
  name: `${slug}.json`, mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({
    format: 'rinegetan-course-import/1', language: 'id',
    source: { name: 'Sumber sintetis', url: 'https://contoh.invalid/seri', rights_holder: 'Pemegang sintetis' },
    license: { name: 'Izin sintetis', notes: 'Hanya untuk uji lokal.' },
    course: { title: `Impor ${slug} ${suffix}`, slug: `${slug}-${suffix}`, summary: 'Ringkasan impor sintetis.' },
    lessons: [
      { position: 1, title: 'Lesson impor satu', slug: 'satu', summary: '', body: 'Paragraf pertama.\n\nParagraf kedua.' },
      { position: 2, title: 'Lesson impor dua', slug: 'dua', summary: '', body: 'Isi kedua.' },
    ],
  })),
});
async function uploadImport(page: Page, file: ReturnType<typeof importFile>) {
  await page.getByRole('button', { name:'Impor JSON', exact:true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Berkas JSON').setInputFiles(file);
  await dialog.getByRole('button', { name:'Unggah untuk ditinjau', exact:true }).click();
}
const importItem = (page: Page, title: string) => page.getByRole('region', { name:'Impor course' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name:title, exact:true }) });

test('course import: Editor stages, Admin rejects and approves into Draft, public stays hidden', async ({ page, local }) => {
  try {
    await open(page, local, 'editor');
    // Invalid file shows a field error and creates nothing.
    const bad = importFile(local.suffix, 'invalid');
    bad.buffer = Buffer.from(bad.buffer.toString().replace('"language":"id"', '"language":"en"'));
    await uploadImport(page, bad);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('language');
    await page.getByRole('dialog').getByRole('button', { name:'Batal', exact:true }).click();
    expect(local.execute(`select count(*) from public.course_imports where course_slug = 'invalid-${local.suffix}'`)).toBe('0');

    await uploadImport(page, importFile(local.suffix, 'tolak'));
    await uploadImport(page, importFile(local.suffix, 'terima'));
    const accepted = importItem(page, `Impor terima ${local.suffix}`);
    await expect(accepted).toContainText('Menunggu persetujuan');
    await expect(accepted.getByRole('button', { name:'Setujui' })).toHaveCount(0);
    await accepted.getByRole('button', { name:'Lihat preview' }).click();
    await expect(accepted.getByRole('heading', { name:'2. Lesson impor dua' })).toBeVisible();
    await expect(accepted.getByText('Paragraf kedua.')).toBeVisible();

    await page.context().clearCookies();
    await open(page, local, 'admin');
    const rejected = importItem(page, `Impor tolak ${local.suffix}`);
    await rejected.getByRole('button', { name:'Tolak', exact:true }).click();
    await page.getByRole('dialog').getByRole('button', { name:'Tolak impor', exact:true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Alasan penolakan wajib diisi');
    await page.getByLabel('Alasan penolakan').fill('Izin belum lengkap.');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    await expect(rejected).toContainText('Alasan penolakan: Izin belum lengkap.');

    const approve = importItem(page, `Impor terima ${local.suffix}`);
    await approve.getByRole('button', { name:'Setujui', exact:true }).click();
    await page.getByRole('dialog').getByRole('button', { name:'Setujui dan buat Draft', exact:true }).click();
    await expect(approve).toContainText('Disetujui');
    const course = card(page, `Impor terima ${local.suffix}`);
    await expect(course).toContainText('Draft');

    const response = await page.request.get(`/pelajari-alkitab/terima-${local.suffix}`, { headers: { cookie: '' } });
    expect(response.status()).toBe(404);

    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    local.execute(`begin;
      delete from public.course_lessons where course_id in (select id from public.courses where slug like '%-${local.suffix}');
      alter table public.course_imports disable trigger course_imports_prepare;
      delete from public.course_imports where course_slug like '%-${local.suffix}';
      alter table public.course_imports enable trigger course_imports_prepare;
      delete from public.courses where slug like '%-${local.suffix}'; commit;`);
  }
});
```

Catatan pelaksana: urutan Tab di dialog tolak adalah textarea → Batal → Tolak impor; bila urutan nyata berbeda, fokuskan tombol dengan `getByRole(...).focus()` lalu tekan Enter — tujuannya membuktikan dialog dapat dioperasikan keyboard. Bila halaman course publik untuk slug Draft mengembalikan kode selain 404 di reader P3-002, sesuaikan ke perilaku reader yang ada (course Draft tidak terlihat publik) dan periksa teks judul tidak muncul. Hapus `course_imports` langsung oleh `postgres` di cleanup diperbolehkan karena `delete` tidak dibatasi trigger; bila trigger tidak perlu dinonaktifkan, hapus dua baris `alter table`.

- [ ] **Step 2: Jalankan suite**

Run: `cd frontend; npm run build; npx playwright test -c tests/visual/staff-courses.config.ts`
Expected: semua test lulus (termasuk test lama).

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/visual/staff-courses.spec.ts
git commit -m "test(e2e): alur impor course staf dan batas publik (P3-003)" -m "Refs #46"
```

---

### Task 6: Contoh berkas dan dokumentasi

**Files:**
- Create: `docs/04-delivery/templates/course-import-example.json`
- Modify: `docs/04-delivery/CONTENT-OPERATIONS.md` (bagian "Impor course"), `docs/03-architecture/DATA-MODEL-AND-RLS.md`, `docs/04-delivery/ISSUE-BACKLOG.md`, `docs/04-delivery/ROADMAP.md`, `docs/04-delivery/SPRINT-PLAN.md`
- Create: `docs/04-delivery/records/P3-003-2026-10-25.md`
- Modify: `frontend/tests/p3-003-course-import-parser.test.mjs` (contoh dokumen harus lolos parser)

**Acceptance Criteria:**
- Contoh berkas lolos `parseCourseImport` (diuji).
- CONTENT-OPERATIONS menjelaskan langkah unggah, preview, persetujuan/penolakan Admin, batas, dan bahwa perbaikan dilakukan dengan unggah ulang sebelum persetujuan atau di CMS setelah Draft.
- Data model mencantumkan `course_imports` dan fungsi approve; status P3-003 di backlog/roadmap/sprint = selesai di development (belum dirilis).
- Record memuat bukti verifikasi tanpa data pribadi/rahasia.

- [ ] **Step 1: Test contoh berkas (gagal)**

```js
// tambahkan ke frontend/tests/p3-003-course-import-parser.test.mjs
import { readFileSync } from "node:fs";
test("documented example file passes the parser", () => {
  const example = readFileSync(new URL("../../docs/04-delivery/templates/course-import-example.json", import.meta.url), "utf8");
  assert.equal(parseCourseImport(example).lessons.length, 2);
});
```

Run: `cd frontend; node --test tests/p3-003-course-import-parser.test.mjs` — Expected: FAIL (berkas belum ada).

- [ ] **Step 2: Buat contoh berkas**

```json
{
  "format": "rinegetan-course-import/1",
  "language": "id",
  "source": { "name": "Contoh Pelayanan (sintetis)", "url": "https://contoh.invalid/seri", "rights_holder": "Contoh Pemegang Hak" },
  "license": { "name": "Izin tertulis (contoh)", "url": "https://contoh.invalid/izin", "notes": "Contoh: boleh ditampilkan di website gereja lokal; tidak untuk dijual." },
  "course": { "title": "Contoh Seri Pendalaman", "slug": "contoh-seri-pendalaman", "summary": "Contoh ringkasan course. Ganti dengan materi asli." },
  "lessons": [
    { "position": 1, "title": "Pelajaran Pertama", "slug": "pelajaran-pertama", "summary": "Ringkasan singkat.", "body": "Paragraf pertama.\n\nParagraf kedua dipisahkan satu baris kosong." },
    { "position": 2, "title": "Pelajaran Kedua", "slug": "pelajaran-kedua", "summary": "", "body": "Isi pelajaran kedua." }
  ]
}
```

- [ ] **Step 3: Perbarui dokumen** — ganti bagian "Impor course (backlog P3-003)" di CONTENT-OPERATIONS dengan panduan berisi: siapa (Editor/Admin unggah, Admin setujui), format dan batas (salin Global Constraints), langkah (Impor JSON → periksa pesan field → Lihat preview → Admin Setujui/Tolak dengan alasan), hasil (course + lesson Draft, terbitkan lewat pengelola course), perbaikan (unggah ulang sebelum keputusan; edit CMS setelah Draft), larangan (tidak ada auto-publish/sync; isi tampil sebagai teks), dan tautan ke contoh berkas. Tambahkan `course_imports` beserta aturan RLS/approve ke DATA-MODEL-AND-RLS; perbarui status P3-003 di ISSUE-BACKLOG, ROADMAP, SPRINT-PLAN (selesai di `development`, belum production). Tulis record `P3-003-2026-10-25.md` berisi keputusan pemilik, ringkasan perubahan, hasil verifikasi (unit, pgTAP, Playwright, CI), dan batas (payload disimpan permanen; belum dirilis).

- [ ] **Step 4: Jalankan test**

Run: `cd frontend; node --test tests/p3-003-course-import-parser.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/04-delivery/templates/course-import-example.json docs/04-delivery docs/03-architecture/DATA-MODEL-AND-RLS.md frontend/tests/p3-003-course-import-parser.test.mjs
git commit -m "docs(p3-003): panduan impor course, contoh berkas, dan record" -m "Refs #46"
```

---

### Task 7: Verifikasi penuh dan PR

**Acceptance Criteria:**
- `npm run test:all` lulus; `supabase test db` lulus; keempat suite Playwright CI lulus lokal untuk staff-courses dan bible-reader.
- PR ke `development` dengan CI kelima job hijau; issue #46 diperbarui sesudah merge.

- [ ] **Step 1:** `cd frontend; npm run test:all` — Expected: typecheck, lint, build, semua test Node lulus.
- [ ] **Step 2:** `npm run supabase -- test db` — Expected: semua file pgTAP lulus.
- [ ] **Step 3:** `npx playwright test -c tests/visual/staff-courses.config.ts; npx playwright test -c tests/visual/bible-reader.config.ts` — Expected: lulus.
- [ ] **Step 4:** Push branch `feature/p3-003-course-import`, buka PR ke `development` (tanpa atribusi AI), tunggu CI, tangani review.
- [ ] **Step 5:** Setelah merge: perbarui record dengan SHA merge, centang acceptance #46, tutup #46, centang P3-003 di tracking #75.

---

## Self-Review

- **Spec coverage:** staging + Draft-only (Task 2, 3), validasi struktur/URL/bahasa/duplikasi/lisensi (Task 1, 2), preview (Task 3 GET, Task 4), Editor/Admin dan Admin-only keputusan (Task 2 RLS/fungsi, Task 3, Task 4), tolak slug duplikat (Task 2 trigger/index, Task 3 409), audit (Task 2), label persetujuan diri (Task 4, 5), daftar metadata maks 50 (Task 3, 4), retensi permanen + tanpa delete (Task 2), anon tanpa akses (Task 2, 5), UI 320 px/keyboard (Task 4, 5), dokumentasi (Task 6), contoh berkas (Task 6).
- **Placeholder scan:** tidak ada TBD/TODO; catatan pelaksana di Task 4–5 menjelaskan penyesuaian konkret, bukan isi yang hilang.
- **Konsistensi tipe:** `CourseImport`, `CourseImportPayload`, `parseCourseImport`, `loadCourseImports`, `decideCourseImport`, `importId`, `importFailure`, `IMPORT_LIST_COLUMNS` dipakai dengan nama yang sama di semua task.
