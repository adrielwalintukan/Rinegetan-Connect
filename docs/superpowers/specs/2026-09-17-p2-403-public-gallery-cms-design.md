# Design Spec: P2-403 — Galeri Publik dan CMS Media

## Metadata
- **Issue:** P2-403
- **Sprint:** 4
- **Branch:** `feature/p2-403-public-gallery-cms`
- **Dependencies:** P2-303 (Mutasi Konten & Audit Trail), P2-401 (Schema Media & Consent), P2-402 (JPEG Derivative & Upload Guardrails)
- **Status:** Proposed

---

## 1. Executive Summary & Problem Statement

Untuk memenuhi kebutuhan dokumentasi warta jemaat GMAHK Rinegetan secara aman, inklusif, dan mematuhi prinsip privasi (*privacy-by-design*):
1. **Galeri Publik yang Aksesibel & Responsif (`/media`)**: Pengunjung jemaat membutuhkan antarmuka visual dua tingkat yang menyajikan album kegiatan dan kisi foto publik dengan filter kategori cepat, navigasi modal *Lightbox* yang ramah keyboard (`Escape`, `ArrowLeft`, `ArrowRight`), serta penanganan *empty state* yang informatif.
2. **Kepatuhan Privasi Publik (Child & Consent Invariant)**: Seluruh query galeri publik **wajib** hanya menampilkan media yang memenuhi:
   $$\text{status} = 'published' \land \text{consent\_status} = 'approved' \land \text{hidden\_at IS NULL}$$
   Tidak ada media berstatus `draft`, `rejected`, `pending`, `revoked`, atau `hidden` yang boleh bocor ke publik.
3. **CMS Media Staf Terpadu (`/staff`)**: Pengurus gereja (Editor & Admin) membutuhkan konsol pengelolaan media langsung pada portal staf terpadu, lengkap dengan formulir upload derivatif (terhubung ke P2-402), penegakan aturan perlindungan anak (*child consent guard*), serta penarikan instan (*takedown/hide*) yang mewajibkan alasan jelas.

---

## 2. Arsitektur Data & Public Query Boundary

### 2.1 Public Queries (`frontend/src/lib/supabase/public-queries.ts`)
Mengikuti pola arsitektur P2-304 yang decoupled dari request cookies sehingga aman untuk ISR/SSG caching:

```typescript
// Mengambil album publik yang berstatus published
export async function getPublicMediaAlbums(): Promise<PublicMediaAlbum[]>

// Mengambil aset media publik dengan filter ketat consent & status
export async function getPublicMediaAssets(options?: {
  category?: MediaCategory;
  albumId?: string;
}): Promise<PublicMediaAsset[]>
```

**Klausa Filter Wajib:**
- `status.eq('published')`
- `consent_status.eq('approved')`
- `hidden_at.is(null)`
- (Opsional) `category.eq(category)` jika bukan `'all'`
- (Opsional) `album_assets.album_id.eq(albumId)` jika difilter per album

### 2.2 Revalidasi Cache Terpadu
Integrasi tag revalidasi pada `triggerPublicRevalidation(entity, path)`:
- Tag baru: `'media-albums'`, `'media-assets'`
- Path: `'/media'`
- Setiap mutasi status publikasi atau upload media baru staf akan otomatis memicu revalidasi tag tersebut.

---

## 3. Galeri Publik Dua Tingkat (`/media`)

### 3.1 Tata Letak Halaman
1. **Header & Hero Banner**:
   - Judul: "Media & Dokumentasi Jemaat"
   - Deskripsi singkat mengenai arsip foto ibadah, pelayanan, dan persekutuan GMAHK Rinegetan.
2. **Tingkat 1: Korsel / Kartu Album Kegiatan Pilihan**:
   - Menampilkan kartu album terbitan dengan gambar sampul (`cover_asset`), judul kegiatan, tanggal kegiatan (WITA), jumlah foto dalam album, dan kategori.
   - Mengklik kartu album akan memfilter kisi foto di bawahnya khusus untuk album tersebut, memunculkan pil indikator aktif: `[X] Album: <Nama Album>`.
3. **Tingkat 2: Bar Filter Kategori & Kisi Foto**:
   - Pil kategori: `Semua`, `Ibadah`, `Pemuda`, `Sekolah Sabat`, `Sosial`, `Fellowship`, `Umum`.
   - Grid foto responsif (1 kolom di mobile, 2 di tablet, 3-4 di desktop) dengan rasio aspek rapi.
   - Setiap kartu foto memuat gambar derivatif web, teks alternatif (`alt`), judul/caption, dan tanggal.
   - Mengklik foto membuka modal **Accessible Lightbox**.
4. **Empty State**:
   - Menampilkan komponen `EmptyState` jika belum ada album/foto yang diterbitkan atau jika filter yang dipilih tidak menemukan hasil.

### 3.2 Accessible Lightbox (`MediaLightbox.tsx`)
- **Semantik Aksesibilitas (WCAG 2.1 AA)**:
  - Container modal memiliki atribut `role="dialog"`, `aria-modal="true"`, dan `aria-label="Penampil Foto"`.
  - Fokus keyboard otomatis diarahkan ke dalam modal saat dibuka (*focus trap*), dan dikembalikan ke tombol pemicu saat ditutup.
- **Interaksi Keyboard**:
  - `Escape`: Menutup modal Lightbox.
  - `ArrowRight`: Berpindah ke foto berikutnya dalam daftar yang sedang aktif.
  - `ArrowLeft`: Berpindah ke foto sebelumnya dalam daftar yang sedang aktif.
- **Fitur Tampilan**:
  - Foto resolusi tinggi derivatif (1920x1920 inside box).
  - Teks alternatif pembaca layar (`alt`) dan *caption* deskripsi.
  - Kategori foto dan tanggal dokumentasi.
  - Indikator posisi foto: `[i + 1] / [total]` (misal: "4 dari 15").
  - Tombol tutup (`aria-label="Tutup penampil foto"`), navigasi sebelumnya (`aria-label="Foto sebelumnya"`), dan navigasi berikutnya (`aria-label="Foto selanjutnya"`).

---

## 4. CMS Media Staf Terpadu (`StaffDashboard.tsx`)

### 4.1 Tab Navigasi Staf
Menambahkan tab baru `"media"` pada `StaffDashboard` berdampingan dengan tab yang ada:
- `Pengumuman`
- `Kegiatan`
- `Jadwal Ibadah`
- `Departemen`
- **`Media & Galeri`** *(Baru)*
- `Audit Log`

### 4.2 Tampilan Daftar Media Staf (`MediaManager.tsx`)
1. **Ringkasan Kuota Pilot (1 GB)**:
   - Bar kapasitas kuota real-time (hijau aman <70%, oranye peringatan $\ge 70\%$, merah beku $\ge 85\%$).
2. **Tabel & Kartu Aset Media**:
   - Pratinjau thumbnail derivatif.
   - Teks alternatif (`alt_text`) & Caption.
   - Tag Kategori (`Ibadah`, `Pemuda`, dll.).
   - Kelompok Usia: `Umum` vs `Anak-anak (Child)`.
   - Status Consent: `Approved` (Hijau), `Pending` (Kuning), `Rejected` (Merah), `Revoked` (Abu-abu).
   - Status Publikasi: `Draft`, `Published`, `Archived`.
   - Indikator Takedown: Tag merah jika `hidden_at` terisi, dilengkapi alasan penarikan (*tooltip* / dialog).

### 4.3 Alur Kerja & Perlindungan Anak (*Child Protection Guard*)
1. **Pencegahan Penerbitan Foto Anak**:
   - Jika `subject_age_group === 'child'` dan `consent_status !== 'approved'`, tombol / opsi untuk mengubah status menjadi `published` **dinonaktifkan** dengan tooltip peringatan: *"Foto anak wajib memiliki izin (consent approved) sebelum dapat dipublikasikan."*
2. **Aksi Perubahan Status**:
   - Staf Editor dan Admin dapat mengubah status `draft` $\leftrightarrow$ `published` $\leftrightarrow$ `archived`.
3. **Penarikan Instan (*Instant Takedown / Hide*)**:
   - Staf dapat menyembunyikan foto seketika dengan dialog konfirmasi yang mewajibkan input `hidden_reason` minimal 3 karakter.
   - Foto seketika hilang dari pandangan publik (`hidden_at = NOW()`).
4. **Hapus Permanen**:
   - Eksklusif untuk peran `admin` dengan konfirmasi keamanan.

### 4.4 Modal Unggah Media Staf (`MediaUploadDialog.tsx`)
- Memanggil endpoint `POST /api/staff/media/upload` (P2-402) via multipart form-data:
  - Input berkas gambar dengan validasi client (JPEG/PNG/WebP, maks 15 MB) dan pratinjau thumbnail sebelum upload.
  - Input teks alternatif (`alt_text`) wajib diisi minimal 3 karakter.
  - Input takarir (`caption`) opsional.
  - Pilihan kategori media (`media_category`).
  - Pilihan kelompok usia (`general` vs `child`).
  - Pilihan status consent awal (`pending`, `approved`, dll.).
  - Pilihan album penampung (opsional).
- Menampilkan pesan error ramah pengguna jika melanggar guardrail atau kuota storage membeku ($\ge 85\%$).

---

## 5. Rencana Pengujian & Quality Gates

### 5.1 Automated Route & Contract Tests (`frontend/tests/p2-403-public-gallery-cms.test.mjs`)
1. **Public Media Query Invariants**:
   - Memastikan query publik hanya menyertakan record `published`, `approved`, dan `hidden_at IS NULL`.
   - Memastikan query filter kategori dan album bekerja akurat.
2. **Revalidation Tags**:
   - Memastikan cache tags `media-albums` dan `media-assets` terdaftar dan dieksekusi saat mutasi media.
3. **Lightbox Contract & Keyboard Semantics**:
   - Memastikan atribut `role="dialog"`, `aria-modal="true"`, dan penanganan tombol `Escape`, `ArrowLeft`, `ArrowRight` terdefinisi.
4. **Child Protection Guardrail**:
   - Memastikan logika publikasi menolak aset bertanda `child` jika consent belum disetujui.

### 5.2 Quality Gates
1. `npm --prefix frontend run test:routes` -> Seluruh tes unit & integrasi lolos.
2. `npm --prefix frontend run lint` -> 0 error, 0 warning.
3. `npm --prefix frontend run build` -> 0 TypeScript error, Next.js build sukses.

### 5.3 Verifikasi Visual Browser Subagent
- Membuka halaman publik `/media`, menguji filter kategori, menguji pembukaan Lightbox dan navigasi keyboard.
- Membuka portal staf `/staff`, beralih ke tab `Media & Galeri`, menguji tampilan aset dan dialog upload.
- Mengambil tangkapan layar (screenshot) sebagai bukti visual untuk deskripsi Pull Request.
