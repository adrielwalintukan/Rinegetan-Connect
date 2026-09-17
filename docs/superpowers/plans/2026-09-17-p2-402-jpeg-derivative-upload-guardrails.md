# P2-402 JPEG Derivative dan Upload Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun pipeline backend pemrosesan derivatif JPEG, pembersihan total metadata EXIF/GPS, validasi guardrails ukuran/piksel, pemantauan kuota pilot 1 GB, dan endpoint upload terproteksi `POST /api/staff/media/upload`.

**Architecture:** Menggunakan library `sharp` di server Next.js untuk transformasi buffer in-memory tanpa menyimpan file original mentah, menerapkan validasi batas dekompresi piksel, menghitung kuota penyimpanan secara dinamis dari database, dan mengunggah derivatif bersih ke private bucket Supabase Storage `'media'`.

**Tech Stack:** Next.js (App Router API Route), Node.js, `sharp`, Supabase Storage & Database, Node.js Test Runner (`node:test`).

**Spec:** [`docs/superpowers/specs/2026-09-17-p2-402-jpeg-derivative-upload-guardrails-design.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-402-jpeg-derivative-upload-guardrails-design.md)

## Global Constraints

- **Dependency floor:** Memanfaatkan skema `public.media_assets`, `album_assets`, dan bucket Supabase Storage `'media'` yang dibangun pada P2-401.
- **Privacy Guarantee:** Seluruh EXIF, IPTC, XMP, dan koordinat GPS/geolokasi wajib dihapus 100% dari derivatif.
- **Zero-Cost Pilot Quota:** Kapasitas total 1 GB (`1_073_741_824` bytes). Warning di 70%, freeze upload baru di 85%, hard cap di 100%.
- **Decompression Bomb Protection:** Maksimal 6.000 x 6.000 piksel dan total luas piksel <= 25 megapiksel.
- **No Originals in Pilot:** File mentah original hanya berada di memori sementara dan tidak pernah disimpan ke Storage.

---

### Task 1: Upload Guardrails and Quota Monitoring Module

**Files:**
- Create: `frontend/src/lib/media/guardrails.mjs`
- Create: `frontend/src/lib/media/guardrails.ts`
- Create: `frontend/tests/p2-402-derivative-guardrails.test.mjs`

**Interfaces:**
- Consumes: Konstanta spesifikasi desain P2-402.
- Produces: `getStorageQuotaMetrics(usedBytes)`, `validateUploadGuardrails(buffer, mimeType, byteLength)`.

- [ ] **Step 1: Write failing guardrails and quota tests**

Buat file `frontend/tests/p2-402-derivative-guardrails.test.mjs` yang memverifikasi:
1. `getStorageQuotaMetrics` menghitung persentase kuota dengan benar untuk status Safe (<70%), Warning (>=70%), Frozen (>=85%), dan Exceeded (>=100%).
2. `validateUploadGuardrails` menolak tipe mime selain JPEG, PNG, dan WebP.
3. `validateUploadGuardrails` menolak ukuran buffer melebihi 15 MB.
4. `validateUploadGuardrails` menolak gambar dengan dimensi piksel melebihi 6000px atau > 25 MP.

- [ ] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: FAIL karena modul guardrails belum dibuat.

- [ ] **Step 3: Implement guardrails and quota service**

Buat `frontend/src/lib/media/guardrails.mjs` dan `guardrails.ts` dengan logika validasi lengkap berbasis `sharp`.

- [ ] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: PASS untuk seluruh pengujian guardrails dan kuota.

- [ ] **Step 5: Commit Task 1**

```bash
git add frontend/src/lib/media/guardrails.mjs frontend/src/lib/media/guardrails.ts frontend/tests/p2-402-derivative-guardrails.test.mjs
git commit -m "feat(media): implement upload guardrails and storage quota monitoring"
```

---

### Task 2: JPEG Derivative Generation Pipeline

**Files:**
- Create: `frontend/src/lib/media/derivative.mjs`
- Create: `frontend/src/lib/media/derivative.ts`
- Modify: `frontend/tests/p2-402-derivative-guardrails.test.mjs`

**Interfaces:**
- Consumes: `sharp` image engine.
- Produces: `createJpegDerivative(inputBuffer)` -> `{ buffer, width, height, bytes, mimeType: 'image/jpeg' }`.

- [ ] **Step 1: Write failing derivative pipeline test**

Tambahkan uji pada `frontend/tests/p2-402-derivative-guardrails.test.mjs`:
1. Mengubah gambar uji (misal PNG 2400x1200) menjadi JPEG derivatif dengan bounding box maks 1920x1920.
2. Memverifikasi metadata keluaran tidak mengandung tag EXIF/GPS.
3. Memverifikasi format keluaran selalu `jpeg`.

- [ ] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: FAIL karena modul derivative belum dibuat.

- [ ] **Step 3: Implement JPEG derivative pipeline**

Buat `frontend/src/lib/media/derivative.mjs` dan `derivative.ts` yang menjalankan transformasi `sharp` (auto-orient, resize fit inside max 1920, encode jpeg quality 82, strip metadata).

- [ ] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/lib/media/derivative.mjs frontend/src/lib/media/derivative.ts frontend/tests/p2-402-derivative-guardrails.test.mjs
git commit -m "feat(media): implement EXIF-stripping JPEG derivative pipeline"
```

---

### Task 3: Staff Media Upload API Route

**Files:**
- Create: `frontend/src/app/api/staff/media/upload/route.ts`
- Modify: `frontend/tests/p2-402-derivative-guardrails.test.mjs`

**Interfaces:**
- Consumes: `requireStaffAuth`, `validateUploadGuardrails`, `getStorageQuotaMetrics`, `createJpegDerivative`, Supabase Storage client.
- Produces: Endpoint `POST /api/staff/media/upload`.

- [ ] **Step 1: Write failing upload API route contract test**

Tambahkan uji pada `frontend/tests/p2-402-derivative-guardrails.test.mjs`:
1. Memverifikasi file `frontend/src/app/api/staff/media/upload/route.ts` ada dan mengekspor method `POST`.
2. Memverifikasi penanganan form-data: validasi `alt_text` wajib ada, validasi file, dan pengecekan kuota.

- [ ] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: FAIL karena route handler belum dibuat.

- [ ] **Step 3: Implement upload route handler**

Buat `frontend/src/app/api/staff/media/upload/route.ts`:
1. Memverifikasi sesi staf (`editor` atau `admin`).
2. Menghitung penggunaan kuota terkini dari `media_assets` (jika kuota >= 85%, tolak dengan `storage_quota_frozen`).
3. Menerima multipart data (`file`, `alt_text`, `caption`, `subject_age_group`, `album_id`).
4. Memvalidasi guardrails dan menghasilkan derivatif JPEG bersih.
5. Memastikan penambahan ukuran file tidak melampaui hard cap 1 GB.
6. Mengunggah derivatif ke bucket `'media'`.
7. Mencatat record ke `public.media_assets` dan `public.album_assets` (jika `album_id` ada).
8. Mencatat audit log mutasi staf.

- [ ] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/src/app/api/staff/media/upload/route.ts frontend/tests/p2-402-derivative-guardrails.test.mjs
git commit -m "feat(api): create staff media upload route with quota checks and derivative processing"
```

---

### Task 4: Documentation, Backlog Sync, and Quality Gate Verification

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Modify: `docs/superpowers/plans/2026-09-17-p2-402-jpeg-derivative-upload-guardrails.md`

- [ ] **Step 1: Run comprehensive quality gate verification**

1. `npm --prefix frontend run test:routes`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run build`

- [ ] **Step 2: Update documentation and backlog**

- Tandai `P2-402` sebagai `selesai` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.
- Tandai `P2-403` sebagai `ready` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.

- [ ] **Step 3: Commit, push branch, and open PR**

Push branch `feature/p2-402-jpeg-derivative-upload-guardrails` ke origin dan buat Pull Request dengan deskripsi komprehensif.
