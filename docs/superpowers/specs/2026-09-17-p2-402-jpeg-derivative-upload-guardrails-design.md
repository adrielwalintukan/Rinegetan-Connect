# Design Spec: P2-402 — JPEG Derivative dan Upload Guardrails

## Metadata
- **Issue:** P2-402
- **Sprint:** 4
- **Branch:** `feature/p2-402-jpeg-derivative-upload-guardrails`
- **Dependencies:** P2-401 (Media Schema, Consent, and Storage Policy)
- **Status:** Proposed

---

## 1. Executive Summary & Problem Statement

Untuk mendukung fitur Galeri dan Pustaka Media jemaat tanpa melanggar batasan tier gratis (*Zero-Cost Pilot Policy* pada [`ZERO-COST-PILOT-AND-DEPLOYMENT.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/04-delivery/ZERO-COST-PILOT-AND-DEPLOYMENT.md)) dan kebijakan privasi perlindungan jemaat pada [`SECURITY-PRIVACY.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/03-architecture/SECURITY-PRIVACY.md), sistem membutuhkan:
1. **Pembersihan Metadata Total (Privacy & Child Safety):** Metadata EXIF seperti model kamera, serial number perangkat, dan koordinat GPS/geolocation **wajib dihapus 100%** sebelum disimpan atau disajikan ke publik.
2. **Penyimpanan Eksklusif Derivatif (No Originals):** File mentah asli (RAW/original) berukuran besar tidak disimpan di storage pilot; sistem hanya menyimpan satu versi derivatif JPEG teroptimasi untuk web.
3. **Upload Guardrails & Decompression Bomb Protection:** Menolak tipe mime tidak sah, ukuran file melebihi batas 15 MB, atau dimensi piksel ekstrem (> 25 megapiksel) yang dapat membebani server memori.
4. **Pemantauan Kuota 1 GB:** Melacak akumulasi bytes di tabel `media_assets` dengan mekanisme ambang batas: warning di 70%, pembekuan upload di 85%, dan hard cap di 100%.

---

## 2. Parameter Guardrails & Validasi Input

### 2.1 Format File & Ukuran
- **MIME Types yang Diizinkan:** `image/jpeg`, `image/png`, `image/webp`.
- **Ukuran File Maksimal:** 15 MB (`15_728_640` bytes).
- **Dimensi Piksel Maksimal:**
  - Lebar maksimal: 6.000 piksel
  - Tinggi maksimal: 6.000 piksel
  - Total luas piksel: maksimal 25.000.000 piksel (mencegah serangan *decompression bomb*).

### 2.2 Kode Error Validasi
- `invalid_file_type`: Jika file bukan JPEG, PNG, atau WebP.
- `file_too_large`: Jika file melebihi 15 MB.
- `dimensions_exceeded`: Jika lebar/tinggi melebihi 6.000 px atau total piksel > 25 MP.
- `invalid_image_buffer`: Jika file korup atau tidak dapat di-decode oleh image engine.

---

## 3. Pipeline Pemrosesan Derivatif JPEG (`sharp`)

Transformasi dilakukan secara in-memory menggunakan library `sharp`:

```typescript
const derivativeBuffer = await sharp(inputBuffer)
  .rotate() // Auto-orientasi berbasis EXIF sebelum di-strip
  .resize({
    width: 1920,
    height: 1920,
    fit: 'inside',
    withoutEnlargement: true
  })
  .jpeg({
    quality: 82,
    progressive: true,
    chromaSubsampling: '4:2:0'
  })
  // Tidak memanggil .withMetadata() -> EXIF & GPS otomatis terhapus
  .toBuffer();
```

### Hasil Pemrosesan:
- Format luaran: `image/jpeg`.
- Resolusi maksimal: 1920 x 1920 piksel (proporsional tanpa distorsi).
- Color profile: sRGB standar web.
- Metadata: Bersih total dari EXIF, IPTC, XMP, dan tag GPS.
- File asli dibuang seketika setelah buffer derivatif terbentuk.

---

## 4. Manajemen Kuota Pilot (1 GB Quota Guard)

Kapasitas total penyimpanan operasional internal pilot adalah **1 GB** (`1_073_741_824` bytes).

### 4.1 Ambang Batas Operasional
| Ambang | Persentase | Ukuran Terpakai | Respon Sistem |
|---|---|---|---|
| **Aman** | < 70% | < 751.619.276 bytes | Upload berjalan normal |
| **Warning** | 70% s.d. < 85% | 751.619.276 s.d. 912.680.549 bytes | Upload diizinkan + header/notifikasi `storage_warning` |
| **Freeze** | 85% s.d. < 100% | 912.680.550 s.d. 1.073.741.823 bytes | Upload baru dibekukan (`storage_quota_frozen`), status HTTP 429/400 |
| **Hard Cap** | >= 100% | >= 1.073.741.824 bytes | Ditolak total (`storage_quota_exceeded`), status HTTP 400 |

### 4.2 Query Monitoring Kuota
Ukuran penggunaan kuota dihitung real-time melalui agregasi database:
```sql
select coalesce(sum(bytes), 0)::bigint as total_bytes
from public.media_assets;
```

---

## 5. Spesifikasi Endpoint Upload Staf

### `POST /api/staff/media/upload`

- **Otorisasi:** Hanya dapat dipanggil oleh staf berstatus aktif dengan peran `editor` atau `admin`.
- **Content-Type:** `multipart/form-data`
- **Field Permintaan:**
  - `file` (File, wajib): File gambar.
  - `alt_text` (String, wajib): Teks deskriptif gambar (1..300 karakter).
  - `caption` (String, opsional): Keterangan gambar.
  - `subject_age_group` (String, opsional): `'general'` (default) atau `'child'`.
  - `album_id` (UUID, opsional): Jika foto langsung dimasukkan ke suatu album.
- **Alur Eksekusi:**
  1. Validasi session staf dan role via `requireStaffAuth()`.
  2. Periksa kuota storage: jika kuota >= 85%, tolak dengan `storage_quota_frozen`.
  3. Validasi mime type, ukuran buffer, dan integritas dimensi gambar.
  4. Jalankan pipeline `sharp` untuk menghasilkan buffer JPEG derivatif bersih.
  5. Periksa apakah ukuran derivatif baru akan melampaui hard cap 1 GB.
  6. Simpan buffer derivatif ke Supabase Storage (bucket `'media'`, path `derivatives/YYYY/MM/{random_uuid}.jpg`).
  7. Insert record ke `public.media_assets` (`status = 'draft'`, `consent_status = 'pending'`, `processing_state = 'ready'`).
  8. Jika `album_id` disertakan, insert ke `public.album_assets`.
  9. Catat audit log mutasi (`media.upload`).
  10. Kembalikan respons 201 Created dengan detail aset dan status kuota terkini.

---

## 6. Struktur File & Modul

1. `frontend/src/lib/media/guardrails.mjs` & `guardrails.ts`:
   - Konstanta guardrails (format yang diizinkan, batas ukuran, ambang kuota 1 GB).
   - Fungsi kalkulasi kuota: `getStorageQuotaMetrics(usedBytes)`.
   - Fungsi validasi buffer: `validateImageGuardrails(fileBuffer, mimeType, byteLength)`.
2. `frontend/src/lib/media/derivative.mjs` & `derivative.ts`:
   - Fungsi `createJpegDerivative(inputBuffer)` berbasis `sharp`.
3. `frontend/src/app/api/staff/media/upload/route.ts`:
   - Next.js App Router POST handler terintegrasi dengan Auth, Storage, dan Database.
4. `frontend/tests/p2-402-derivative-guardrails.test.mjs`:
   - Unit dan contract tests yang menguji guardrails, pembersihan EXIF, limit piksel, dan kalkulasi kuota.
