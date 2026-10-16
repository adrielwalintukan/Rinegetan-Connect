## 🎯 Ringkasan Perubahan (Issue P2-403)

Pull Request ini mengimplementasikan issue **`P2-403 — Galeri publik dan CMS media`** pada milestone **Sprint 4 (Galeri Kegiatan, Pustaka Media, dan Consent Privasi)**.

Fitur ini menghadirkan antarmuka galeri foto publik yang inklusif dan ramah aksesibilitas, terintegrasi langsung dengan Supabase Storage dan database relasional media, serta menyediakan konsol manajemen media (*Media CMS*) terpadu di portal staf `/staff` dengan penegakan ketat protokol perlindungan anak (*child protection compliance*) dan batas kuota pilot 1 GB.

---

## 📸 Bukti Visual Tampilan Web (Verified Web UI)

Berikut adalah tangkapan layar verifikasi langsung di lingkungan Next.js dev & production build:

### 1. Galeri Publik & Filter Kategori (`/media`)
Antarmuka publik dua tingkat dengan album kegiatan pilihan, pil filter kategori interaktif (*Semua, Ibadah, Pemuda, Sekolah Sabat, Sosial, Fellowship, Umum*), dan status *thematic EmptyState* ketika konten belum tersedia.
![Galeri Publik](https://raw.githubusercontent.com/adrielwalintukan/Rinegetan-Connect/feature/p2-403-public-gallery-cms/docs/04-delivery/screenshots/p2-403/01-public-gallery.png)

### 2. CMS Media Staf & Pemantauan Kuota Pilot (`/staff`)
Tab "Media & Galeri" pada portal staf menampilkan ringkasan penggunaan kuota pilot 1 GB secara real-time, bilah pencarian & filter izin/status, kartu aset dengan badge status, kartu subjek anak dengan peringatan keamanan dan penguncian tombol publikasi, serta aksi penarikan instan (*takedown*).
![CMS Media Staf](https://raw.githubusercontent.com/adrielwalintukan/Rinegetan-Connect/feature/p2-403-public-gallery-cms/docs/04-delivery/screenshots/p2-403/02-staff-media-cms.png)

### 3. Modal Unggah Media & Guardrail Perlindungan Anak
Modal unggah terintegrasi dengan pipeline derivatif JPEG, validasi teks alternatif wajib (min 3 karakter) untuk pembaca layar, toggle kelompok usia subjek (*Subjek Anak-anak*), selektor consent, dan peringatan bahwa foto anak tidak dapat dipublikasikan tanpa consent yang disetujui.
![Modal Unggah Media](https://raw.githubusercontent.com/adrielwalintukan/Rinegetan-Connect/feature/p2-403-public-gallery-cms/docs/04-delivery/screenshots/p2-403/03-staff-media-upload-dialog.png)

---

## 🏛️ Detail Arsitektur & Implementasi

### 1. Galeri Publik & Aksesibilitas Lightbox (`frontend/src/components/media/MediaLightbox.tsx` & `MediaPage.tsx`)
- **Aksesibilitas Penuh (WCAG AA compliant)**:
  - Menggunakan atribut semantik dialog: `role="dialog"`, `aria-modal="true"`, `aria-label="Tampilan detail foto"`.
  - Kontrol navigasi keyboard: tombol `Escape` untuk menutup dialog, panah kiri (`ArrowLeft`) untuk foto sebelumnya, panah kanan (`ArrowRight`) untuk foto berikutnya.
  - Teks alternatif (`alt`) wajib ada pada seluruh foto dan dicantumkan secara gamblang di antarmuka pembaca layar.
- **Tata Letak Dua Tingkat**:
  - Bagian atas: Album kegiatan unggulan/pilihan yang dapat diklik untuk memfilter langsung foto dalam album tersebut.
  - Bagian bawah: Bar filter kategori dengan tombol reset dan kisi foto responsif yang menjaga rasio aspek derivatif 1920px.
  - Penanganan kasus kosong dengan komponen `EmptyState` tematik tanpa data palsu/mock data fallback.

### 2. Guardrail Perlindungan Anak & Privasi (*Child Protection Invariant*)
- **Aturan Ketat SQL & Client-Side Guard**:
  - Aset dengan `subject_age_group = 'child'` **dilarang keras** dipublikasikan jika `consent_status !== 'approved'`.
  - Pada `MediaManager.tsx`, kartu foto subjek anak tanpa consent menampilkan banner peringatan `🔒 Publikasi dikunci: foto anak wajib memiliki persetujuan consent.` dan menonaktifkan tombol *Terbitkan*.
  - Query publik (`getPublicMediaAssets`) secara mutlak memfilter `status = 'published'`, `consent_status = 'approved'`, dan `hidden_at IS NULL`.
- **Penarikan Cepat (*Instant Takedown*)**:
  - Tombol *Tarik* membuka dialog penarikan instan yang mewajibkan staf mencantumkan alasan penarikan (`hidden_reason`) minimal 3 karakter sebelum waktu penarikan `hidden_at` disimpan.

### 3. Konsol Kurasi Media & Ringkasan Kuota Pilot 1 GB (`MediaManager.tsx`)
- Mengawasi batas penyimpanan gratis Supabase Storage pilot (1,024 MB):
  - Status Aman (`< 80%`), Peringatan (`80% - 95%`), dan Pembekuan Unggah (`>= 95%`).
- Menghubungkan mutasi staf langsung ke endpoint mutasi media:
  - `/api/staff/media/upload` (P2-402)
  - `/api/staff/media/status` (perubahan status publikasi & takedown)
  - `/api/staff/media/delete` (penghapusan permanen eksklusif admin)
- Revalidasi on-demand cache Next.js terintegrasi melalui tag `media-albums`, `media-assets`, dan rute `/media`.

---

## 🧪 Hasil Verifikasi & Quality Gates

| Quality Gate | Perintah | Status | Catatan |
|---|---|---|---|
| **Test Runner (Contract & Routes)** | `npm --prefix frontend run test:routes` | ✅ **PASS (78/78)** | 6 test P2-403 baru + 72 regression tests |
| **ESLint** | `npm --prefix frontend run lint` | ✅ **PASS (0 errors, 0 warnings)** | Clean code standard |
| **Next.js Production Build** | `npm --prefix frontend run build` | ✅ **PASS (20 routes compiled)** | `/media` ISR 1m, `/staff` dynamic |
| **Browser Visual Verification** | Browser Subagent | ✅ **PASS** | 3 tangkapan layar UI terverifikasi |

---

## 📦 Perubahan Berkas

- `frontend/src/lib/public/queries.mjs` & `queries.ts` — Penambahan query publik `getPublicMediaAlbums()` dan `getPublicMediaAssets()`, serta pendaftaran cache tag `media-albums`, `media-assets`, `public-media`.
- `frontend/src/lib/media/constants.ts` & `constants.mjs` — Konstanta isolasi kuota & guardrail media untuk komponen klien.
- `frontend/src/lib/media/url.ts` — Helper resolver URL publik foto derivatif.
- `frontend/src/components/media/MediaLightbox.tsx` — Komponen lightbox dengan kontrol keyboard aksesibel.
- `frontend/src/components/pages/MediaPage.tsx` — Komponen galeri publik responsif dengan filter kategori dan album.
- `frontend/src/components/staff/MediaUploadDialog.tsx` — Modal unggah media dengan validasi alt text, consent, dan child protection.
- `frontend/src/components/staff/MediaManager.tsx` — Konsol kurasi media staf dengan pemantauan kuota 1 GB dan instant takedown.
- `frontend/src/components/staff/StaffDashboard.tsx` — Penambahan tab `Media & Galeri`.
- `frontend/src/app/(public)/media/page.tsx` — Integrasi SSR & ISR galeri publik.
- `frontend/src/app/staff/(protected)/page.tsx` — Pengambilan data server-side awal untuk aset dan album media staf.
- `frontend/tests/p2-403-public-gallery-cms.test.mjs` — 6 unit & contract tests baru untuk public gallery dan media CMS.
- `docs/04-delivery/screenshots/p2-403/` — 3 artefak visual tangkapan layar UI.
- `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md` — Pembaruan status backlog P2-403 (`selesai`) dan P2-404 (`ready`).
