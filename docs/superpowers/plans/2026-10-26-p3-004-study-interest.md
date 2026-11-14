# P3-004 Form Minat Belajar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** Pengunjung `/pelajari-alkitab` dapat mengirim minat belajar (nama, kontak, pesan) dengan persetujuan eksplisit, Turnstile, honeypot, dan rate limit; hanya Admin aktif yang dapat membaca dan mengubah status lead.

**Architecture:** Satu Route Handler publik `POST /api/minat-belajar` memvalidasi lalu insert memakai server key; klien tidak punya grant tulis. Rate limit persisten di `form_rate_events` lewat fungsi `check_form_rate` (service_role saja). Admin membaca/mengubah status lewat RLS dan `PATCH /api/staff/study-interest/[id]`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3, Supabase (Postgres 17, RLS, pgTAP), Cloudflare Turnstile, `node --test`, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-26-p3-004-study-interest-design.md](../specs/2026-10-26-p3-004-study-interest-design.md)

## Global Constraints

- Branch `feature/p3-004-study-interest`, basis `development` `6dc89ed`. Commit tanpa atribusi AI; akhiri pesan commit dengan `Refs #47`.
- Field: nama 1–100, kontak 1–254, pesan 0–1000 code point (`Array.from(s).length`, sama dengan `char_length`). Normalisasi: CRLF→LF, `trim()`, tolak NUL dan surrogate tunggal (`isWellFormed`).
- Kontak: email `^[^\s@]+@[^\s@]+\.[^\s@]+$` atau telepon `^[0-9 +()\-]+$` dengan 8–15 digit.
- Rate limit: `study_interest_attempt` 20/jam sebelum Turnstile; `study_interest` 5/jam setelah Turnstile. Hash IP = HMAC-SHA256(IP, `SUPABASE_SECRET_KEY`) hex 32 karakter.
- Turnstile fail-closed: tanpa `TURNSTILE_SECRET_KEY` → 503; siteverify gagal/timeout 5 detik → 400.
- `Content-Type: application/json` wajib di kedua route (415). Body publik maksimal 8192 byte (413), UTF-8 ketat.
- Consent: `STUDY_INTEREST_CONSENT_VERSION = "draft-2026-10-26"`; copy menyebut tujuan, retensi 24 bulan, pengelola Admin gereja; checkbox tidak tercentang default.
- Tidak ada isi form di log, audit, maupun email. Tidak ada delete lead (P3-006).
- Test key publik Cloudflare (lokal/CI saja): site key lulus `1x00000000000000000000AA`; secret lulus `1x0000000000000000000000000000000AA`; secret gagal `2x0000000000000000000000000000000AA`.
- Tanpa dependency baru. Bahasa UI Indonesia. Target sentuh ≥ 44 px, tanpa overflow pada 320 px.
- Jangan pernah menulis key nyata ke repo; `.env.example` hanya nama variabel.

---

### Task 1: Logika form (validasi, hash IP, body, alur submit)

**Files:**
- Create: `frontend/src/lib/forms/study-interest.mjs`, `frontend/src/lib/forms/study-interest.ts` (re-export, pola `imports.ts`)
- Test: `frontend/tests/p3-004-study-interest.test.mjs`

**Interfaces:**
- Produces:
  - `STUDY_INTEREST_CONSENT_VERSION: "draft-2026-10-26"`, `MAX_STUDY_INTEREST_BYTES = 8192`
  - `class StudyInterestError extends UserFacingError { status: number; field?: string }`
  - `parseStudyInterest(input: unknown): { name: string; contact: string; message: string; honeypot: boolean; turnstileToken: string }` — melempar `StudyInterestError(400, field)`.
  - `hashFormIp(ip: string, key: string): string` (32 hex)
  - `clientIp(request: Request): string` — entri pertama `x-forwarded-for`, fallback `"127.0.0.1"`.
  - `readFormBody(request: Request): Promise<unknown>` — 415/413/400.
  - `submitStudyInterest(input: unknown, deps): Promise<{ status: number; body: { success?: true; message?: string; error?: string; field?: string } }>` dengan `deps = { ipHash: string; turnstileSecret?: string; verifyTurnstile(token, secret, ipHash) => Promise<boolean>; checkRate(form, ipHash, limit) => Promise<boolean>; insertLead(row) => Promise<void> }`.
  - `verifyTurnstile(token: string, secret: string, fetchImpl = fetch): Promise<boolean>` — POST form-encoded ke `https://challenges.cloudflare.com/turnstile/v0/siteverify`, `AbortSignal.timeout(5000)`, `true` hanya bila JSON `success === true`; error apa pun → `false`.

**Acceptance Criteria:**
- Kunci tak dikenal, consent bukan `true`, nama/kontak kosong atau terlalu panjang, kontak bukan email/telepon, NUL/surrogate → 400 dengan `field` dan pesan Indonesia tanpa memantulkan input.
- Honeypot `website` tidak kosong → 200 sukses generik, tanpa memanggil Turnstile/rate/insert.
- Urutan: parse → rate attempt (20) → Turnstile (tanpa secret 503; gagal 400) → rate submit (5) → insert → 201. Rate false → 429. Insert gagal → 500 `GENERIC_ERROR_MESSAGE`.
- `hashFormIp` deterministik, 32 hex, berbeda dari SHA-256 polos dan berbeda antar-kunci.
- Tidak ada `console.*` di modul.

- [ ] **Step 1: Tulis tes yang gagal** di `frontend/tests/p3-004-study-interest.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseStudyInterest, submitStudyInterest, hashFormIp, readFormBody, verifyTurnstile, STUDY_INTEREST_CONSENT_VERSION } from "../src/lib/forms/study-interest.mjs";

export const validInput = () => ({ name: "Budi", contact: "+62 812-3456-7890", message: "Ingin belajar", consent: true, website: "", turnstileToken: "tok" });
const deps = (over = {}) => {
  const calls = [];
  return { calls, ipHash: "a".repeat(32), turnstileSecret: "secret",
    verifyTurnstile: async (...a) => { calls.push(["turnstile", ...a]); return true; },
    checkRate: async (form, hash, limit) => { calls.push(["rate", form, limit]); return true; },
    insertLead: async (row) => { calls.push(["insert", row]); }, ...over };
};

test("valid submission runs attempt rate, turnstile, submit rate, insert in order", async () => {
  const d = deps();
  const res = await submitStudyInterest(validInput(), d);
  assert.equal(res.status, 201);
  assert.deepEqual(d.calls.map((c) => c[0] === "rate" ? `rate:${c[1]}:${c[2]}` : c[0]), ["rate:study_interest_attempt:20", "turnstile", "rate:study_interest:5", "insert"]);
  assert.deepEqual(d.calls.at(-1)[1], { name: "Budi", contact: "+62 812-3456-7890", message: "Ingin belajar", consent_version: STUDY_INTEREST_CONSENT_VERSION });
});
test("honeypot returns generic success without side effects", async () => {
  const d = deps();
  const res = await submitStudyInterest({ ...validInput(), website: "http://spam" }, d);
  assert.equal(res.status, 200); assert.equal(d.calls.length, 0);
});
for (const [label, patch, field] of [
  ["consent missing", { consent: false }, "consent"],
  ["empty name", { name: "  " }, "name"],
  ["name over 100", { name: "a".repeat(101) }, "name"],
  ["contact free text", { contact: "besok saja" }, "contact"],
  ["phone with 7 digits", { contact: "123 4567" }, "contact"],
  ["message over 1000", { message: "😀".repeat(1001) }, "message"],
  ["NUL in message", { message: "a\0b" }, "message"],
]) test(`rejects ${label}`, async () => {
  const d = deps();
  const res = await submitStudyInterest({ ...validInput(), ...patch }, d);
  assert.equal(res.status, 400); assert.equal(res.body.field, field); assert.equal(d.calls.length, 0);
  assert.ok(!JSON.stringify(res.body).includes("besok saja"));
});
test("rejects unknown keys", () => assert.throws(() => parseStudyInterest({ ...validInput(), extra: 1 }), { status: 400 }));
test("accepts email and 1000 emoji message", () => {
  assert.equal(parseStudyInterest({ ...validInput(), contact: "a@b.co", message: "😀".repeat(1000) }).contact, "a@b.co");
});
test("missing turnstile secret fails closed with 503", async () => {
  const d = deps({ turnstileSecret: undefined });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 503);
  assert.ok(!d.calls.some((c) => c[0] === "insert"));
});
test("turnstile failure is 400 and never inserts", async () => {
  const d = deps({ verifyTurnstile: async () => false });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 400);
  assert.ok(!d.calls.some((c) => c[0] === "insert"));
});
test("attempt and submit rate limits return 429", async () => {
  assert.equal((await submitStudyInterest(validInput(), deps({ checkRate: async (f) => f !== "study_interest_attempt" }))).status, 429);
  const d = deps({ checkRate: async (f) => f !== "study_interest" });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 429);
});
test("insert failure is a generic 500", async () => {
  const res = await submitStudyInterest(validInput(), deps({ insertLead: async () => { throw Object.assign(new Error("db text"), { code: "XX000" }); } }));
  assert.equal(res.status, 500); assert.ok(!JSON.stringify(res.body).includes("db text"));
});
test("hashFormIp is keyed HMAC, not plain sha256", () => {
  const h = hashFormIp("203.0.113.5", "k1");
  assert.match(h, /^[0-9a-f]{32}$/);
  assert.equal(h, hashFormIp("203.0.113.5", "k1"));
  assert.notEqual(h, hashFormIp("203.0.113.5", "k2"));
  assert.ok(!createHash("sha256").update("203.0.113.5").digest("hex").startsWith(h));
});
test("readFormBody enforces JSON content type, size and UTF-8", async () => {
  const req = (body, type = "application/json") => new Request("http://x", { method: "POST", headers: { "content-type": type }, body });
  await assert.rejects(readFormBody(req("{}", "text/plain")), { status: 415 });
  await assert.rejects(readFormBody(req("x".repeat(8193))), { status: 413 });
  await assert.rejects(readFormBody(req(new Uint8Array([0xff]))), { status: 400 });
  assert.deepEqual(await readFormBody(req('{"a":1}')), { a: 1 });
});
test("verifyTurnstile is true only for success === true and false on errors", async () => {
  assert.equal(await verifyTurnstile("t", "s", async () => new Response('{"success":true}')), true);
  assert.equal(await verifyTurnstile("t", "s", async () => new Response('{"success":false}')), false);
  assert.equal(await verifyTurnstile("t", "s", async () => { throw new Error("net"); }), false);
});
```

- [ ] **Step 2:** `cd frontend; node --test tests/p3-004-study-interest.test.mjs` — Expected: FAIL (modul belum ada).

- [ ] **Step 3: Implementasi** `frontend/src/lib/forms/study-interest.mjs`:

```js
// frontend/src/lib/forms/study-interest.mjs
import { createHmac } from "node:crypto";
import { UserFacingError, GENERIC_ERROR_MESSAGE } from "../api/errors.mjs";

export const STUDY_INTEREST_CONSENT_VERSION = "draft-2026-10-26";
export const MAX_STUDY_INTEREST_BYTES = 8192;
const KEYS = ["name", "contact", "message", "consent", "website", "turnstileToken"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +()\-]+$/;
const SUCCESS = "Terima kasih. Tim kami akan menghubungi Anda.";

export class StudyInterestError extends UserFacingError {
  /** @param {string} message @param {number} [status] @param {string} [field] */
  constructor(message, status = 400, field) { super(message); this.name = "StudyInterestError"; this.status = status; this.field = field; }
}
/** @param {unknown} value @param {string} field @param {string} label @param {number} max @param {boolean} required */
function text(value, field, label, max, required) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new StudyInterestError(`${label} tidak valid.`, 400, field);
  const clean = value.replace(/\r\n?/g, "\n").trim();
  if (clean.includes("\0") || !clean.isWellFormed()) throw new StudyInterestError(`${label} berisi karakter yang tidak diizinkan.`, 400, field);
  if (required && !clean) throw new StudyInterestError(`${label} wajib diisi.`, 400, field);
  if (Array.from(clean).length > max) throw new StudyInterestError(`${label} maksimal ${max.toLocaleString("id-ID")} karakter.`, 400, field);
  return clean;
}
/** @param {unknown} input */
export function parseStudyInterest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StudyInterestError("Format permintaan tidak valid.");
  const data = /** @type {Record<string, unknown>} */ (input);
  if (Object.keys(data).some((key) => !KEYS.includes(key))) throw new StudyInterestError("Format permintaan tidak valid.");
  const honeypot = typeof data.website === "string" && data.website.trim() !== "";
  const name = text(data.name, "name", "Nama", 100, true);
  const contact = text(data.contact, "contact", "Kontak", 254, true);
  const digits = contact.replace(/\D/g, "").length;
  if (!EMAIL.test(contact) && !(PHONE.test(contact) && digits >= 8 && digits <= 15)) {
    throw new StudyInterestError("Isi nomor WhatsApp atau email yang valid.", 400, "contact");
  }
  const message = text(data.message, "message", "Pesan", 1000, false);
  if (data.consent !== true) throw new StudyInterestError("Centang persetujuan untuk melanjutkan.", 400, "consent");
  const turnstileToken = typeof data.turnstileToken === "string" ? data.turnstileToken : "";
  return { name, contact, message, honeypot, turnstileToken };
}
/** @param {string} ip @param {string} key */
export function hashFormIp(ip, key) { return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32); }
/** @param {Request} request */
export function clientIp(request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"; }

/** @param {Request} request @returns {Promise<unknown>} */
export async function readFormBody(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw new StudyInterestError("Format permintaan tidak valid.", 415);
  const tooBig = () => new StudyInterestError("Isian terlalu panjang.", 413);
  if (Number(request.headers.get("content-length")) > MAX_STUDY_INTEREST_BYTES) throw tooBig();
  const chunks = []; let total = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length > MAX_STUDY_INTEREST_BYTES) { await reader.cancel(); throw tooBig(); }
      chunks.push(value); total += value.length;
    }
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new StudyInterestError("Format permintaan tidak valid.", 400); }
}

/** @param {string} token @param {string} secret @param {typeof fetch} [fetchImpl] */
export async function verifyTurnstile(token, secret, fetchImpl = fetch) {
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret, response: token }), signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    return json?.success === true;
  } catch { return false; }
}

/** @param {unknown} input @param {{ ipHash: string, turnstileSecret?: string, verifyTurnstile: (token: string, secret: string) => Promise<boolean>, checkRate: (form: string, ipHash: string, limit: number) => Promise<boolean>, insertLead: (row: object) => Promise<void> }} deps */
export async function submitStudyInterest(input, deps) {
  let lead;
  try { lead = parseStudyInterest(input); }
  catch (error) {
    if (error instanceof StudyInterestError) return { status: error.status, body: { error: error.message, field: error.field } };
    throw error;
  }
  if (lead.honeypot) return { status: 200, body: { success: true, message: SUCCESS } };
  const limited = { status: 429, body: { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." } };
  try {
    if (!(await deps.checkRate("study_interest_attempt", deps.ipHash, 20))) return limited;
    if (!deps.turnstileSecret) return { status: 503, body: { error: "Formulir sementara tidak tersedia." } };
    if (!lead.turnstileToken || !(await deps.verifyTurnstile(lead.turnstileToken, deps.turnstileSecret))) {
      return { status: 400, body: { error: "Verifikasi gagal, silakan coba lagi.", field: "turnstile" } };
    }
    if (!(await deps.checkRate("study_interest", deps.ipHash, 5))) return limited;
    await deps.insertLead({ name: lead.name, contact: lead.contact, message: lead.message, consent_version: STUDY_INTEREST_CONSENT_VERSION });
  } catch { return { status: 500, body: { error: GENERIC_ERROR_MESSAGE } }; }
  return { status: 201, body: { success: true, message: SUCCESS } };
}
```

Re-export `frontend/src/lib/forms/study-interest.ts` mengikuti pola `frontend/src/lib/courses/imports.ts` (baca berkas itu dan tiru bentuknya).

- [ ] **Step 4:** `node --test tests/p3-004-study-interest.test.mjs` — Expected: PASS. Lalu `npm run typecheck` dan `npm run lint` — Expected: bersih.
- [ ] **Step 5: Commit** `feat(forms): validasi dan alur submit minat belajar (P3-004)`.

---

### Task 2: Database (lead, rate events, RLS, audit)

**Files:**
- Create: `supabase/migrations/20261026000000_p3_004_study_interest.sql`
- Test: `supabase/tests/p3_004_study_interest.test.sql`

**Interfaces:**
- Produces: tabel `public.study_interest_leads` (kolom sesuai spec), `public.form_rate_events`, fungsi `public.check_form_rate(p_form text, p_ip_hash text, p_limit integer, p_window interval) returns boolean` (execute hanya `service_role`). Error message trigger: `study_interest_immutable`.

**Acceptance Criteria:**
- Grant: anon dan authenticated tidak bisa insert/delete lead; authenticated hanya select/update dan dibatasi RLS `private.is_admin()`; `form_rate_events` dan `check_form_rate` tidak bisa diakses anon/authenticated.
- Constraint teks dan kontak sesuai Global Constraints (termasuk `= btrim`, tanpa NUL tidak perlu karena Postgres menolak NUL di text).
- Trigger update: hanya `status` boleh berubah, mengisi `handled_by`/`handled_at`; pengecualian ON DELETE SET NULL `handled_by` (pola `private.prepare_course_import` P3-003). Perubahan lain → `study_interest_immutable` (23514).
- Audit `study_interest.created` (insert) dan `study_interest.status_changed` (status berubah) di `public.audit_logs` dengan `changes = {status}` saja.
- `check_form_rate`: hapus event form itu yang lebih tua dari 24 jam; `pg_advisory_xact_lock(hashtext(p_form || p_ip_hash))`; hitung event dalam window; bila `< p_limit` insert event dan `true`, selain itu `false`.

- [ ] **Step 1: Tulis pgTAP** `supabase/tests/p3_004_study_interest.test.sql` meniru struktur `supabase/tests/p3_003_course_imports.test.sql` (user sintetis `...@example.invalid` dengan UUID prefix `91000000-...`, Admin aktif, Editor, Admin nonaktif, non-staf; `begin; select no_plan(); ... rollback;`). Kasus wajib:
  - `set local role service_role`: insert lead valid berhasil; insert dengan kontak `'besok saja'`, nama 101 karakter, nama `' x'` (belum terpangkas) → `23514`.
  - anon: `select`/`insert` lead → `42501`; `select * from form_rate_events` → `42501`; `select check_form_rate(...)` → `42501`.
  - authenticated non-staf dan Editor: `select` lead mengembalikan 0 baris; `update` mengembalikan 0 baris; `insert` → `42501`; `delete` → `42501`; `check_form_rate` → `42501`.
  - Admin nonaktif: 0 baris.
  - Admin: melihat lead; `update set status = 'contacted'` berhasil dan `handled_by` = Admin, `handled_at` terisi; `update set name = 'x'` → `23514` `study_interest_immutable`; `status = 'unknown'` → `23514`.
  - Audit: ada `study_interest.created` dan `study_interest.status_changed`; `select count(*) from audit_logs where entity_type = 'study_interest_leads' and (changes ? 'name' or changes ? 'contact' or changes ? 'message')` = 0.
  - Rate: sebagai `service_role`, panggil `check_form_rate('study_interest', repeat('a', 32), 5, '1 hour')` enam kali → lima `true` lalu `false`; hash lain tetap `true`; event berumur 25 jam (insert manual dengan `created_at = now() - interval '25 hours'`) terhapus setelah panggilan berikutnya.
  - Hapus user Admin yang menangani lead (`delete from auth.users where id = ...` sebagai superuser) berhasil dan `handled_by` menjadi null.

- [ ] **Step 2:** `cd frontend; npm run supabase -- db reset` lalu `npm run supabase -- test db` — Expected: FAIL (tabel belum ada).

- [ ] **Step 3: Migration** `supabase/migrations/20261026000000_p3_004_study_interest.sql`:

```sql
-- supabase/migrations/20261026000000_p3_004_study_interest.sql
-- P3-004: private study-interest leads; written only by the server route with the service key.
create table public.study_interest_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  contact text not null check (
    char_length(contact) between 1 and 254 and contact = btrim(contact)
    and (contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (contact ~ '^[0-9 +()-]+$' and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 8 and 15))
  ),
  message text not null default '' check (char_length(message) <= 1000 and message = btrim(message)),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz
);
create index study_interest_leads_created_at_idx on public.study_interest_leads (created_at desc);

create table public.form_rate_events (
  id bigint generated always as identity primary key,
  form text not null check (form in ('study_interest', 'study_interest_attempt')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);
create index form_rate_events_lookup_idx on public.form_rate_events (form, ip_hash, created_at);
```

Tes pgTAP memakai hash 32 hex nyata (`repeat('a', 32)`, `repeat('b', 32)`); constraint tidak boleh dilonggarkan untuk tes.

Lanjutkan migration dengan:
- `private.prepare_study_interest_lead()` (SECURITY DEFINER, `search_path=''`): pada UPDATE, izinkan bila satu-satunya perubahan adalah `handled_by` menjadi null dan user lama tidak ada lagi di `auth.users` (salin logika dari `private.prepare_course_import` di `supabase/migrations/20261025000000_p3_003_course_imports.sql`); selain itu bila `(to_jsonb(new) - array['status','handled_by','handled_at']) is distinct from (to_jsonb(old) - ...)` → `raise check_violation using message = 'study_interest_immutable'`; set `new.handled_by := auth.uid(); new.handled_at := now()`. Pada INSERT: `new.status := 'new'; new.handled_by := null; new.handled_at := null; new.created_at := now(); new.consented_at := now();`.
- `private.record_study_interest_audit()` (SECURITY DEFINER): INSERT → `study_interest.created`; UPDATE dengan status berubah → `study_interest.status_changed`; `changes = jsonb_build_object('status', new.status)`; `entity_type = 'study_interest_leads'`; UPDATE tanpa perubahan status → tidak diaudit.
- Trigger before insert/update dan after insert/update; `revoke all on function ... from public, anon, authenticated`.
- `public.check_form_rate(...)` SECURITY DEFINER `search_path=''` sesuai Acceptance; `revoke all ... from public, anon, authenticated; grant execute ... to service_role;`.
- Grant: `revoke all on table public.study_interest_leads, public.form_rate_events from public, anon, authenticated; grant select, update on public.study_interest_leads to authenticated; grant select, insert, update, delete on both tables to service_role;` dan `grant usage, select on sequence` identity bila diperlukan service_role.
- RLS enable pada kedua tabel; policy `study_interest_leads_admin_select` (select, authenticated, `using ((select private.is_admin()))`) dan `study_interest_leads_admin_update` (update, `using` dan `with check` `(select private.is_admin())`). Tidak ada policy untuk `form_rate_events`.

- [ ] **Step 4:** `npm run supabase -- db reset` dan `npm run supabase -- test db` — Expected: semua file PASS.
- [ ] **Step 5: Commit** `feat(db): tabel lead minat belajar, rate limit form, dan RLS Admin (P3-004)`.

---

### Task 3: Route publik `POST /api/minat-belajar`

**Files:**
- Create: `frontend/src/app/api/minat-belajar/route.ts`
- Test: tambahkan ke `frontend/tests/p3-004-study-interest.test.mjs` (atau berkas baru `frontend/tests/p3-004-study-interest-route.test.mjs` bila perlu loader TS seperti `tests/p3-003-course-import-route.test.mjs`)

**Interfaces:**
- Consumes: semua export Task 1; `createSupabaseAdminClient` (`@/lib/supabase/admin`); fungsi DB `check_form_rate`, tabel `study_interest_leads` (Task 2).

**Acceptance Criteria:**
- `export const runtime = "nodejs"`. Alur: `readFormBody` (error `StudyInterestError` → status-nya); `SUPABASE_SECRET_KEY` atau admin client tidak tersedia → 503 "Formulir sementara tidak tersedia."; `ipHash = hashFormIp(clientIp(request), process.env.SUPABASE_SECRET_KEY)`; `submitStudyInterest(input, deps)` dengan `checkRate` memanggil `admin.rpc("check_form_rate", { p_form, p_ip_hash, p_limit, p_window: "1 hour" })` (error → lempar), `insertLead` memanggil `admin.from("study_interest_leads").insert(row)` (error → lempar), `verifyTurnstile` dari Task 1, `turnstileSecret: process.env.TURNSTILE_SECRET_KEY`.
- Respons `Response.json(result.body, { status: result.status })`. Tidak ada `console.*` dengan isi permintaan.
- Tes route (memuat route TS seperti tes route P3-003) membuktikan: 415 untuk `text/plain`, 413 untuk body > 8 KB, 503 tanpa `TURNSTILE_SECRET_KEY`, 201 dengan admin client tiruan dan Turnstile tiruan; dan bahwa body respons tidak pernah memuat nama/kontak/pesan.

- [ ] **Step 1:** Baca `frontend/tests/p3-003-course-import-route.test.mjs` untuk cara memuat route TS dan menyuntik modul tiruan; tulis tes gagal dengan pola yang sama.
- [ ] **Step 2:** Jalankan — Expected: FAIL.
- [ ] **Step 3: Implementasi**

```ts
// frontend/src/app/api/minat-belajar/route.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StudyInterestError, clientIp, hashFormIp, readFormBody, submitStudyInterest, verifyTurnstile } from "@/lib/forms/study-interest";

export const runtime = "nodejs";
const unavailable = () => Response.json({ error: "Formulir sementara tidak tersedia." }, { status: 503 });

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try { input = await readFormBody(request); }
  catch (error) {
    if (error instanceof StudyInterestError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return unavailable();
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try { admin = createSupabaseAdminClient(); } catch { return unavailable(); }
  const result = await submitStudyInterest(input, {
    ipHash: hashFormIp(clientIp(request), key),
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
    verifyTurnstile: (token, secret) => verifyTurnstile(token, secret),
    checkRate: async (form, ipHash, limit) => {
      const { data, error } = await admin.rpc("check_form_rate", { p_form: form, p_ip_hash: ipHash, p_limit: limit, p_window: "1 hour" });
      if (error) throw error;
      return data === true;
    },
    insertLead: async (row) => {
      const { error } = await admin.from("study_interest_leads").insert(row);
      if (error) throw error;
    },
  });
  return Response.json(result.body, { status: result.status });
}
```

- [ ] **Step 4:** `npm run test`, `npm run typecheck`, `npm run lint` — Expected: PASS/bersih.
- [ ] **Step 5: Commit** `feat(api): route publik form minat belajar (P3-004)`.

---

### Task 4: UI publik (CTA, form, Turnstile, tautan lesson)

**Files:**
- Create: `frontend/src/components/learning/StudyInterestForm.tsx` (client component)
- Modify: `frontend/src/app/(public)/pelajari-alkitab/page.tsx` (bagian `<section id="ingin-belajar" aria-labelledby="ingin-belajar-title">` setelah katalog), `frontend/src/app/(public)/pelajari-alkitab/[courseSlug]/[lessonSlug]/page.tsx` (tautan `href="/pelajari-alkitab#ingin-belajar"` teks "Ingin belajar bersama?" di area navigasi bawah, `min-h-11`)
- Test: `frontend/tests/p3-004-study-interest-ui.test.mjs` (tes kontrak sumber, pola `tests/p3-003-course-import-ui.test.mjs`)

**Interfaces:**
- Consumes: `STUDY_INTEREST_CONSENT_VERSION` tidak dipakai di klien; endpoint `POST /api/minat-belajar` dengan body `{ name, contact, message, consent, website, turnstileToken }`, respons `{ success, message }` atau `{ error, field }`.

**Acceptance Criteria:**
- Judul `h2` "Ingin belajar bersama?" (id `ingin-belajar-title`). Copy (draf, menunggu pengesahan gereja) memuat: tujuan ("Data ini hanya dipakai Admin gereja untuk menghubungi Anda tentang belajar Alkitab bersama."), retensi ("Data disimpan paling lama 24 bulan, lalu dihapus."), dan bahwa data tidak dibagikan ke pihak lain.
- Field berlabel terlihat: Nama (`maxLength` tidak dipakai sebagai satu-satunya validasi), Nomor WhatsApp atau email, Pesan (opsional). Checkbox persetujuan tidak tercentang default, label: "Saya setuju data ini disimpan dan dipakai untuk dihubungi sesuai penjelasan di atas."
- Honeypot `website`: dibungkus elemen `aria-hidden="true"` dengan kelas visual tersembunyi (`absolute -left-[9999px]`), input `tabIndex={-1}` `autoComplete="off"`.
- Turnstile: `next/script` `src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"` lalu `window.turnstile.render(el, { sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, callback: setToken, "expired-callback": () => setToken("") })`; setelah submit, `window.turnstile.reset()`. Tanpa site key: tampilkan "Formulir belum tersedia. Silakan hubungi gereja melalui halaman Kontak." dengan tautan `/kontak`, tanpa form.
- Error per field ditampilkan di bawah field (`aria-describedby`, `aria-invalid`); ringkasan error `role="alert"` menerima fokus; tombol "Kirim" nonaktif dan bertuliskan "Mengirim…" saat mengirim; sukses ditampilkan di `role="status"` dan form dikosongkan. Kegagalan jaringan memakai `clientErrorMessage` dari `@/lib/api/errors`.
- Gaya mengikuti komponen yang ada (`card-surface`, `btn-primary`, `min-h-11`); tanpa overflow pada 320 px.

- [ ] **Step 1:** Tulis tes kontrak sumber yang gagal (baca berkas komponen sebagai teks; assert keberadaan copy tujuan/retensi, checkbox tanpa `defaultChecked`/`checked={true}`, honeypot `aria-hidden` + `tabIndex={-1}`, URL script Turnstile, `role="status"`, `role="alert"`, `id="ingin-belajar"` di halaman katalog, tautan `#ingin-belajar` di halaman lesson).
- [ ] **Step 2:** Jalankan — Expected: FAIL.
- [ ] **Step 3:** Implementasi komponen dan halaman sesuai Acceptance.
- [ ] **Step 4:** `npm run test`, `npm run typecheck`, `npm run lint` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(public): CTA dan form minat belajar di Pelajari Alkitab (P3-004)`.

---

### Task 5: Tab staf "Minat belajar" (Admin) dan route status

**Files:**
- Create: `frontend/src/lib/forms/study-interest-admin.mjs` (+ `.ts`), `frontend/src/components/staff/StudyInterestManager.tsx`, `frontend/src/app/api/staff/study-interest/[id]/route.ts`
- Modify: `frontend/src/components/staff/StaffDashboard.tsx` (TabType `"interest"`, label "Minat belajar", hanya Admin, sama seperti `staff`/`audit`), `frontend/src/app/staff/(protected)/page.tsx` (muat lead hanya bila `staff.role === "admin"`; tab `interest` untuk non-Admin dialihkan seperti `staff`/`audit`)
- Test: `frontend/tests/p3-004-study-interest-admin.test.mjs`

**Interfaces:**
- Produces:
  - `STUDY_INTEREST_COLUMNS = "id, name, contact, message, status, created_at, handled_at"`
  - `loadStudyInterestLeads(client): Promise<{ data: Lead[] | null; error: boolean }>` — 50 terbaru, `order("created_at", { ascending: false })`.
  - `parseLeadStatus(input: unknown): "new" | "contacted" | "closed"` — hanya objek `{ status }`; lainnya `StudyInterestError(400)`.
  - `updateLeadStatus(client, id: string, status, role): Promise<{ id: string; status: string }>` — non-Admin → 403; id bukan UUID → 400; 0 baris → 404.
  - Tipe `StudyInterestLead` di `frontend/src/types/forms.ts`.

**Acceptance Criteria:**
- Route `PATCH`: `Content-Type: application/json` wajib (415); `requireActiveStaff`; error akses memakai pola `staffAccessResponse` (`frontend/src/lib/courses/import-actions.mjs`); error DB memakai `publicErrorMessage`.
- Editor: tidak ada tab, server tidak memanggil `loadStudyInterestLeads`, `PATCH` → 403.
- Daftar menampilkan nama, kontak, pesan sebagai teks (`whitespace-pre-line`, tanpa `dangerouslySetInnerHTML`), tanggal masuk WITA dan usia ("12 hari"), status dengan `<select>` berlabel; perubahan status memanggil route lalu `router.refresh()`; error tampil `role="alert"`. Kosong: "Belum ada minat belajar."
- Tanpa overflow pada 320 px; target ≥ 44 px.

- [ ] **Step 1:** Tulis tes gagal: `parseLeadStatus` (valid/tidak valid/kunci lain), `updateLeadStatus` dengan klien tiruan (Editor 403, UUID salah 400, 0 baris 404, sukses), `loadStudyInterestLeads` (urutan, limit 50, error → `{data:null,error:true}`), kontrak sumber: tab `interest` hanya Admin di `StaffDashboard.tsx`, `page.tsx` memanggil loader hanya untuk Admin.
- [ ] **Step 2:** Jalankan — Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** `npm run test`, `npm run typecheck`, `npm run lint` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(staff): tab Minat belajar khusus Admin (P3-004)`.

---

### Task 6: E2E Playwright dan env test

**Files:**
- Modify: `frontend/tests/helpers/local-course-fixture.mjs` (env app: `SUPABASE_SECRET_KEY` = key service lokal dari `supabase status -o json` field `SERVICE_ROLE_KEY` hanya bila URL loopback sudah diverifikasi; `TURNSTILE_SECRET_KEY='1x0000000000000000000000000000000AA'`; `NEXT_PUBLIC_TURNSTILE_SITE_KEY='1x00000000000000000000AA'`), `.github/workflows/ci.yml` (job browser: ekspor `SUPABASE_SECRET_KEY` dari status JSON tanpa mencetak, serta dua variabel test key Turnstile ke `$GITHUB_ENV` sebelum build), `frontend/tests/visual/staff-courses.spec.ts`
- Test: tes baru di `frontend/tests/visual/staff-courses.spec.ts`

**Acceptance Criteria:**
- Tes "study interest: visitor submits with consent, Admin handles, Editor cannot see":
  1. Anonim membuka `/pelajari-alkitab#ingin-belajar`; kirim tanpa centang persetujuan → error persetujuan terlihat, tidak ada baris baru (cek via `local.execute`).
  2. Isi nama/kontak sintetis (`Uji ${suffix}`, `uji-${suffix}@example.invalid`), centang, tunggu token Turnstile test key, kirim → pesan sukses `role="status"`; tepat satu baris lead dengan nama itu.
  3. Editor: tab "Minat belajar" tidak ada; `PATCH /api/staff/study-interest/{id}` → 403.
  4. Admin: tab "Minat belajar" menampilkan lead; ubah status ke "Sudah dihubungi" → baris DB `status = 'contacted'`.
  5. Viewport 320 px pada form publik dan tab Admin: `scrollWidth <= clientWidth`.
  6. Bersihkan lead dan `form_rate_events` sintetis di `afterAll` (lewat `local.execute` sebagai superuser lokal).
- `npx playwright test -c tests/visual/staff-courses.config.ts` dan `-c tests/visual/bible-reader.config.ts` lulus.
- Langkah CI tidak mencetak key; komentar menyatakan key adalah key lokal CLI / test key publik Cloudflare.

- [ ] **Step 1:** Baca `local-course-fixture.mjs` dan tes impor P3-003 di `staff-courses.spec.ts` untuk helper `local.execute`, login, dan `suffix`.
- [ ] **Step 2:** Tulis tes; jalankan — Expected: FAIL sebelum env diperbarui.
- [ ] **Step 3:** Perbarui fixture env dan `ci.yml`.
- [ ] **Step 4:** Jalankan kedua config Playwright — Expected: PASS.
- [ ] **Step 5: Commit** `test(e2e): alur form minat belajar dan akses Admin (P3-004)`.

---

### Task 7: Dokumen dan record

**Files:**
- Modify: `docs/03-architecture/DATA-MODEL-AND-RLS.md` (bagian `study_interest_leads` dan `form_rate_events`, baris "Berikutnya" diperbarui, relasi), `docs/03-architecture/SECURITY-PRIVACY.md` (subbagian form minat belajar di bawah "Proteksi form Phase 3": HMAC IP, dua batas rate, fail-closed, tanpa isi di log/email), `docs/04-delivery/CONTENT-OPERATIONS.md` (langkah Admin menangani lead di tab **Minat belajar**), `docs/04-delivery/ISSUE-BACKLOG.md` (status P3-003 merge `6dc89ed` PR #86; P3-004 di branch fitur), `docs/04-delivery/records/P3-003-2026-10-25.md` (merge `6dc89ed` 2026-10-25, CI development run 40196762417 lulus), `frontend/.env.example` (`TURNSTILE_SECRET_KEY=` dan `NEXT_PUBLIC_TURNSTILE_SITE_KEY=` tanpa nilai), `docs/04-delivery/ROADMAP.md`/`SPRINT-PLAN.md` bila menyebut status P3-004
- Create: `docs/04-delivery/records/P3-004-2026-10-26.md`

**Acceptance Criteria:**
- Record P3-004 memuat: keputusan pemilik, perubahan, bukti verifikasi lokal aktual (jumlah tes Node, pgTAP, Playwright yang diamati), **gate rilis production** (copy disahkan gereja + P3-006 atau runbook hapus manual; key Turnstile production diisi pemilik di Vercel), batas dan risiko (`x-forwarded-for`, Turnstile butuh jaringan di CI). Tanpa project ref, email nyata, URL privat, atau secret.
- Status spec diperbarui.
- `npm run test` lulus (bila ada tes dokumen).

- [ ] **Step 1:** Perbarui dokumen dan buat record.
- [ ] **Step 2:** `cd frontend; npm run test` — Expected: PASS.
- [ ] **Step 3: Commit** `docs(p3-004): panduan, model data, keamanan, dan record form minat belajar`.

---

### Task 8: Verifikasi penuh dan PR

**Acceptance Criteria:**
- `npm run test:all` lulus; `npm run supabase -- test db` lulus; Playwright staff-courses dan bible-reader lulus lokal.
- PR ke `development` tanpa atribusi AI dengan `Closes #47`; CI 5/5 hijau; review ditangani.

- [ ] **Step 1:** `cd frontend; npm run test:all`
- [ ] **Step 2:** `npm run supabase -- db reset` lalu `npm run supabase -- test db`
- [ ] **Step 3:** `npx playwright test -c tests/visual/staff-courses.config.ts; npx playwright test -c tests/visual/bible-reader.config.ts`
- [ ] **Step 4:** Review akhir seluruh branch, push, buka PR ke `development`, pantau CI, tangani review.
- [ ] **Step 5:** Setelah merge: catat SHA merge di record, centang acceptance #47, tutup #47, centang P3-004 di #75.

---

## Self-Review

- **Cakupan spec:** field/consent/copy (T1, T4), kontak (T1, T2), HMAC IP (T1, T3), dua batas rate (T1, T2, T3), fail-closed Turnstile (T1, T3), `Content-Type` (T1, T5), tabel/RLS/audit/FK cleanup (T2), UI publik + tautan lesson (T4), tab Admin + usia lead (T5), e2e + env test (T6), dokumen + gate rilis + SHA P3-003 (T7), PR (T8).
- **Placeholder:** tidak ada TBD.
- **Konsistensi nama:** `submitStudyInterest`, `parseStudyInterest`, `hashFormIp`, `clientIp`, `readFormBody`, `verifyTurnstile`, `StudyInterestError`, `check_form_rate`, `study_interest_leads`, `form_rate_events`, `loadStudyInterestLeads`, `updateLeadStatus`, `parseLeadStatus`, TabType `"interest"` dipakai sama di semua task.
