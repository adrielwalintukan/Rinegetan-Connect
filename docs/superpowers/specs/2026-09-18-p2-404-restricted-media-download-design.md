# P2-404 — Restricted Media Download Design Specification

## 1. Pendahuluan & Ringkasan Fitur

Sistem GMAHK Jemaat Rinegetan memerlukan fungsionalitas pengunduhan media yang aman, berkeadilan kuota, dan taat privasi. Dokumen ini mendefinisikan arsitektur dan spesifikasi teknis untuk implementasi milestone **P2-404 — Unduhan media yang dibatasi** (*Restricted Media Download*).

Fitur ini mencakup:
1. Unduhan foto tunggal resolusi web teroptimasi (JPEG derivatif).
2. Unduhan arsip album dalam format `.zip` secara *streaming on-the-fly*.
3. Unduhan arsip kategori dalam format `.zip` secara *streaming on-the-fly*.
4. Pemeriksaan syarat kelayakan ketat (*eligibility guards*), perlindungan privasi anak, dan proteksi bebas kebocoran master (*zero master leaks*).
5. Pembatasan laju permintaan (*sliding-window rate limiter*) dan pembatasan beban arsip (maks. 35 foto / 50 MB).
6. Pencatatan audit ke tabel `public.audit_logs`.
7. Tombol interaktif dan indikator proses unduhan pada `MediaLightbox` dan `MediaPage`.

---

## 2. Batasan Lingkup (*Scope & Non-Scope*)

### Dalam Lingkup (In-Scope):
- Endpoint API:
  - `GET /api/media/download/[id]` — unduhan foto tunggal derivatif.
  - `GET /api/media/download/album/[id]` — unduhan album berformat ZIP streaming.
  - `GET /api/media/download/category/[category]` — unduhan kategori berformat ZIP streaming.
- Modul pembantu kelayakan (*eligibility checker*): validasi `status`, `consent_status`, `hidden_at`, dan `public_download_enabled`.
- Modul rate limiter: membatasi maksimal 6 permintaan per 60 detik per IP dengan respons `429 Too Many Requests`.
- Mesin streaming ZIP berbasis library `archiver` dengan batas 35 file / 50 MB dan proteksi batas waktu 15 detik.
- Audit logger untuk merekam aksi unduhan anonim maupun terautentikasi ke `public.audit_logs`.
- Komponen UI:
  - Tombol unduh dengan indikator status aktif/nonaktif pada `MediaLightbox.tsx`.
  - Tombol unduh album dengan status loading dan penanganan notifikasi error pada `MediaPage.tsx`.
- Pengujian otomatis (unit & route test) untuk memastikan seluruh kriteria kelayakan dan batas rate limit terverifikasi.

### Di Luar Lingkup (Non-Scope):
- Pengunduhan file master asli resolusi penuh (resolusi master hanya untuk arsip internal staf gereja).
- Pembuatan antrean job background asynchronous (telah disepakati menggunakan *streaming on-the-fly* yang lebih ringan dan efisien untuk kapasitas pilot gereja).

---

## 3. Aturan Keamanan & Syarat Kelayakan (*Eligibility Invariants*)

### Invariant 1: Syarat Kelayakan Aset Foto (*Photo Eligibility*)
Setiap aset foto yang diunduh wajib memenuhi kriteria:
1. `status = 'published'`
2. `consent_status = 'approved'`
3. `hidden_at IS NULL`
4. `public_download_enabled = true`
5. **Perlindungan Anak:** Foto dengan `subject_age_group = 'child'` dan `consent_status != 'approved'` secara mutlak tidak boleh diunduh atau dimasukkan ke dalam arsip ZIP apa pun.

### Invariant 2: Syarat Kelayakan Album
1. `media_albums.status = 'published'`
2. `media_albums.public_download_enabled = true`
3. Hanya foto di dalam album yang memenuhi *Invariant 1* yang dimasukkan ke dalam arsip ZIP.
4. Jika tidak ada foto yang memenuhi syarat, server mengembalikan status HTTP `403 Forbidden` atau `404 Not Found`.

### Invariant 3: Zero Master Leaks
- File yang disajikan ke publik selalu merupakan file JPEG derivatif (`derivatives/...jpg`) yang telah melalui pembersihan EXIF/GPS via Sharp.
- Master mentah tidak pernah disajikan melalui endpoint publik.

---

## 4. Arsitektur & Spesifikasi Endpoint

### 4.1 Single Photo Download: `GET /api/media/download/[id]`
- **Parameter:** `id` (UUID dari `media_assets.id`).
- **Alur Kerja:**
  1. Periksa laju permintaan IP (*rate limit check*).
  2. Query data aset dari database Supabase (`media_assets`).
  3. Evaluasi *Invariant 1*. Jika tidak lolos, kembalikan HTTP `404 Not Found` atau `403 Forbidden`.
  4. Ambil buffer gambar derivatif dari bucket `media`.
  5. Catat audit log secara asinkron (`media.download_asset`).
  6. Kembalikan respons HTTP dengan:
     - Header `Content-Type: image/jpeg`
     - Header `Content-Disposition: attachment; filename="rinegetan-[asset-id].jpg"`
     - Header `Cache-Control: private, no-transform, max-age=3600`

### 4.2 Album ZIP Download: `GET /api/media/download/album/[id]`
- **Parameter:** `id` (UUID dari `media_albums.id`).
- **Alur Kerja:**
  1. Periksa laju permintaan IP.
  2. Ambil data album dan daftar aset berelasi via `album_assets` -> `media_assets`.
  3. Evaluasi kelayakan album (*Invariant 2*) dan filter hanya aset yang *eligible* (*Invariant 1*).
  4. Ambil maksimal 35 aset teratas (diurutkan berdasarkan urutan album / tanggal terbaru).
  5. Inisialisasi streaming response `Content-Type: application/zip` dengan header `Content-Disposition: attachment; filename="rinegetan-album-[slug].zip"`.
  6. Gunakan `archiver` untuk mengalirkan file-file JPEG ke dalam zip secara langsung.
  7. Sisipkan file `README.txt` di dalam ZIP berisi informasi lisensi dan jemaat.
  8. Catat audit log (`media.download_album`).

### 4.3 Category ZIP Download: `GET /api/media/download/category/[category]`
- **Parameter:** `category` (enum: `ibadah`, `pemuda`, `sekolah_sabat`, `sosial`, `fellowship`, `umum`).
- **Alur Kerja:**
  1. Validasi enum kategori.
  2. Ambil maksimal 35 aset foto terbaru dalam kategori tersebut yang memenuhi *Invariant 1*.
  3. Alirkan ZIP dengan nama `rinegetan-kategori-[category].zip`.
  4. Catat audit log (`media.download_category`).

---

## 5. Rate Limiter & Proteksi Beban Server

- **Algoritma:** In-memory sliding window / token bucket.
- **Kapasitas:** 6 permintaan per 60 detik per IP.
- **Header:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After: 60`.
- **Status Kode:** `429 Too Many Requests`.

---

## 6. Audit Logging

Pencatatan dilakukan pada tabel `public.audit_logs`:
- `actor_id`: `NULL` (anonim) atau UUID user.
- `action`: `'media.download_asset'`, `'media.download_album'`, atau `'media.download_category'`.
- `entity_type`: `'media_asset'`, `'media_album'`, atau `'media_category'`.
- `entity_id`: UUID entitas terkait.
- `changes`:
  ```json
  {
    "ip_hash": "...",
    "user_agent": "...",
    "file_count": 1,
    "total_bytes": 1048576,
    "slug": "..."
  }
  ```

---

## 7. Rencana Pengujian (*Verification Plan*)

1. **Unit Test:**
   - Evaluasi fungsi eligibility checker: menolak `status != published`, `consent_status != approved`, `hidden_at != null`, `public_download_enabled = false`.
   - Evaluasi rate limiter: mengizinkan 6 permintaan berturut-turut, menolak permintaan ke-7 dengan status 429, dan reset setelah jendela waktu usai.
2. **Integration / Route Test:**
   - Test endpoint `GET /api/media/download/[id]` dengan aset publik yang diizinkan (200 OK + Content-Disposition attachment).
   - Test endpoint dengan aset yang dinonaktifkan unduhannya (403/404).
   - Test endpoint unduhan album ZIP: memastikan hanya aset eligible yang masuk dan format ZIP valid.
   - Test audit log: memastikan row baru tercipta pada `public.audit_logs`.
3. **Verifikasi Visual Antarmuka:**
   - Buka halaman `/media`, uji tombol unduh album.
   - Buka `MediaLightbox`, periksa tombol unduh foto tunggal dan verifikasi perilakunya.
