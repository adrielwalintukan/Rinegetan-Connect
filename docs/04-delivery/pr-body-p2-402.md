## 🎯 Ringkasan Perubahan (Issue P2-402)

Pull Request ini menyelesaikan issue **`P2-402 — JPEG derivative dan upload guardrails`** pada milestone **Sprint 4 (Galeri Kegiatan, Pustaka Media, dan Consent Privasi)**.

Modul ini menyediakan pipeline pemrosesan media berbasis `sharp` yang efisien, aman, dan mematuhi privasi jemaat:
1. **Validasi Guardrail Ketat**: Melindungi server dari *decompression bomb / pixel flood* dan muatan tidak valid sebelum buffer diproses lebih lanjut.
2. **Pembersihan Metadata Privasi (EXIF/GPS)**: Menghapus 100% informasi lokasi GPS, data kamera, dan metadata personal lainnya.
3. **Pipeline In-Memory JPEG Derivative**: Mengompresi gambar ke standar web (maksimal 1920x1920 px, kualitas JPEG 82) langsung di dalam memori tanpa pernah menyimpan file master/asli mentah pada storage pilot.
4. **Pemantauan Kuota Storage 1 GB**: Menghitung ambang batas storage (70% Warning, 85% Freeze, 100% Exceeded) untuk mencegah eksploitasi kapasitas storage proyek.
5. **Staff Upload API Route**: Endpoint terproteksi `POST /api/staff/media/upload` untuk staf editor dan admin.

---

## 🛡️ Rincian Fitur & Implementasi

### 1. Guardrails & Quota Service (`frontend/src/lib/media/guardrails.ts`)
- **Tipe MIME Diizinkan**: `image/jpeg`, `image/png`, `image/webp`. Format lain (SVG, TIFF, PDF, executable) ditolak seketika.
- **Batas Ukuran File**: Maksimal 15 MB (`MAX_UPLOAD_BYTES = 15 * 1024 * 1024`).
- **Proteksi Bom Dekompresi**:
  - Dimensi piksel maksimal: 6.000 px (`MAX_PIXEL_DIMENSION = 6000`).
  - Total piksel maksimal: 25 Megapixels (`MAX_TOTAL_PIXELS = 25_000_000`).
- **Monitoring Kuota Storage Pilot (1 GB)**:
  - Kapasitas: 1.073.741.824 bytes (1 GB).
  - Peringatan (Warning): $\ge 70\%$ penggunaan.
  - Pembekuan Upload (Freeze): $\ge 85\%$ penggunaan (`storage_quota_frozen`).
  - Melebihi Kuota (Exceeded): $\ge 100\%$ kapasitas (`storage_quota_exceeded`).

### 2. JPEG Derivative Pipeline (`frontend/src/lib/media/derivative.ts`)
- Transformasi menggunakan engine `sharp`:
  - `rotate()`: Auto-orientasi sesuai tag EXIF sebelum EXIF dihapus.
  - `resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })`: Membatasi ukuran dalam bounding box tanpa memperbesar gambar kecil.
  - `jpeg({ quality: 82, mozjpeg: true })`: Kompresi optimal web.
  - Metadata EXIF, GPS, IPTC, dan XMP otomatis dieliminasi (*stripped*) secara default oleh pipeline pemrosesan `sharp`.
- **Zero-Footprint Asli**: File asli diproses secara streaming/buffer di memori RAM dan **tidak pernah disimpan** di bucket Supabase Storage, menjaga privasi dan menghemat kuota pilot.

### 3. Staff Media Upload Endpoint (`frontend/src/app/api/staff/media/upload/route.ts`)
- **Autentikasi & Otorisasi**: Wajib peran aktif `editor` atau `admin` melalui `requireActiveStaff()`.
- **Validasi Multipart Form-Data**:
  - `file`: Wajib ada dan lolos guardrail (tipe, ukuran, dimensi).
  - `alt_text`: Wajib minimal 3 karakter non-kosong untuk aksesibilitas dan SEO.
  - `category`: Validasi enumerasi `public.media_category`.
  - `subject_age_group`: Validasi kelompok umur (`general` vs `child`).
  - `consent_status`: Validasi status consent (`pending`, `approved`, `rejected`, `revoked`).
  - `album_id` (opsional): Menghubungkan aset dengan album kegiatan via `public.album_assets`.
- **Pengecekan Kuota**: Menolak upload jika kapasitas storage mencapai $\ge 85\%$.
- **Penyimpanan Storage**: Mengunggah derivatif JPEG ke path terorganisir: `derivatives/<YYYY>/<MM>/<uuid>.jpg`.
- **Audit Logging**: Mencatat mutasi ke tabel `public.audit_logs`.

---

## 🧪 Hasil Verifikasi & Quality Gates

| Quality Gate | Perintah | Status | Keterangan |
|---|---|---|---|
| **Node.js Test Runner** | `npm --prefix frontend run test:routes` | ✅ **PASS (69/69)** | 9 test P2-402 baru + 60 regression tests |
| **P2-402 Unit Tests** | `node --test frontend/tests/p2-402-derivative-guardrails.test.mjs` | ✅ **PASS (9/9)** | Guardrails, quota thresholds, EXIF stripping, upload route contract |
| **TypeScript Typecheck** | `npm --prefix frontend run build` | ✅ **PASS** | 0 type errors, Next.js App Router build berhasil |
| **ESLint** | `npm --prefix frontend run lint` | ✅ **PASS** | 0 errors, 0 warnings |

---

## 📝 Catatan Tambahan
Issue P2-402 berfokus pada infrastruktur backend dan pipeline pemrosesan media. Tidak ada perubahan UI pada issue ini. Antarmuka pengguna (Galeri Publik dan CMS Media Staf) akan dibangun pada issue selanjutnya: **`P2-403 — Galeri publik dan CMS media`**.
