# P2-405 — Site Section Media CMS Design Specification

## 1. Pendahuluan & Ringkasan Fitur

Pada Phase 1 dan awal Phase 2, gambar-gambar seksi halaman publik (seperti Hero Beranda, Sambutan "Selamat Datang di GMAHK Rinegetan", seksi pelajaran di halaman Sekolah Sabat, dan seksi profil komunitas di halaman Tentang Kami) masih bersifat statis (*hardcoded*) di dalam berkas `frontend/src/data/content.js`.

Dokumen ini mendefinisikan arsitektur dan spesifikasi teknis untuk implementasi milestone **P2-405 — Pengelolaan media dan banner seksi halaman publik (Site Section Media CMS)**. Fitur ini memungkinkan staf dengan peran **Editor** dan **Admin** untuk:
1. Memilih foto dari galeri media (`public.media_assets`) untuk dijadikan banner seksi halaman publik.
2. Mengunggah foto baru secara langsung dari kartu seksi yang otomatis diproses melalui pipeline derivatif Sharp (pembersihan EXIF/GPS, kompresi, dan pengecekan kuota 1 GB).
3. Mereset konfigurasi gambar seksi kembali ke gambar bawaan (*default fallback*).
4. Menerapkan perubahan secara instan ke pengunjung publik melalui revalidasi cache on-demand Next.js.

---

## 2. Batasan Lingkup (*Scope & Non-Scope*)

### Dalam Lingkup (In-Scope):
- **Database:** Tabel `public.site_section_media`, RLS policy untuk publik (read) dan staf (write/mutate), serta audit trigger mutasi.
- **Rute API:**
  - `POST /api/staff/settings/section-media` — endpoint staf untuk mengaitkan aset foto ke seksi halaman atau mereset ke default.
- **Lapisan Kueri & Revalidasi:**
  - Fungsi kueri publik `getSiteSectionMedia()` di `frontend/src/lib/public/queries.mjs`.
  - Revalidasi tag `site-section-media` dan rute terkait (`/`, `/sekolah-sabat`, `/tentang-kami`).
- **Antarmuka CMS Staf:**
  - Sub-panel/tab "Banner Halaman" pada portal staf `/staff`.
  - 4 kartu konfigurasi seksi: `home_hero`, `home_welcome`, `sekolah_sabat`, `tentang_kami`.
  - Modal pemilih foto dari galeri media dan tombol unggah langsung.
- **Integrasi Komponen Publik:**
  - `Hero.jsx`, `WelcomeSection.jsx`, `SekolahSabatPage.jsx`, dan `TentangKamiPage.jsx` dengan fallback otomatis ke `content.js`.
- **Pengujian:** Unit test, contract route test, dan verifikasi visual browser.

### Di Luar Lingkup (Non-Scope):
- Pengelolaan banner dinamis tak terbatas (pada tahap ini difokuskan pada 4 seksi utama yang disetujui).
- Perubahan layout atau struktur CSS halaman publik (hanya mengganti sumber media, alt text, dan caption).

---

## 3. Skema Database & Izin Keamanan (RLS)

### 3.1 Tabel `public.site_section_media`
```sql
create table public.site_section_media (
  section_key text primary key
    check (section_key in ('home_hero', 'home_welcome', 'sekolah_sabat', 'tentang_kami')),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  custom_alt_text text check (custom_alt_text is null or char_length(custom_alt_text) between 1 and 300),
  custom_caption text check (custom_caption is null or char_length(custom_caption) between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
```

### 3.2 Row Level Security (RLS)
1. `site_section_media_public_read`:
   - `for select to anon, authenticated using (true)`
2. `site_section_media_staff_write`:
   - `for all to authenticated using (private.is_editor_or_admin()) with check (private.is_editor_or_admin())`

### 3.3 Audit Logging
Setiap mutasi dicatat ke `public.audit_logs` dengan aksi `site_settings.update_section_media`.

---

## 4. Arsitektur API & Kueri Publik

### 4.1 Kueri Publik: `getSiteSectionMedia()`
Mengembalikan pemetaan (*map*) seksi:
```typescript
export interface SectionMediaItem {
  section_key: "home_hero" | "home_welcome" | "sekolah_sabat" | "tentang_kami";
  asset_id: string;
  image_url: string;
  alt_text: string;
  caption?: string | null;
}
export type SiteSectionMediaMap = Record<string, SectionMediaItem>;
```

### 4.2 Endpoint Staf: `POST /api/staff/settings/section-media`
- **Payload:**
  ```json
  {
    "section_key": "home_hero",
    "asset_id": "uuid-asset-id", // atau null untuk reset ke default
    "custom_alt_text": "Teks alternatif kustom (opsional)",
    "custom_caption": "Keterangan kustom (opsional)"
  }
  ```
- **Validasi:**
  - Wajib login sebagai Editor atau Admin (`assertCanMutateContent`).
  - `section_key` valid.
  - Jika `asset_id` diisi, wajib ada di `media_assets` dengan status `published` dan consent `approved`.
- **Revalidasi:** Memanggil `triggerPublicRevalidation` untuk membersihkan cache `/`, `/sekolah-sabat`, `/tentang-kami`, dan tag `site-section-media`.

---

## 5. Antarmuka CMS Staf (`/staff`)

1. **Panel Banner Halaman:**
   - 4 Kartu Seksi:
     1. **Hero Beranda** (`home_hero`) — Foto ibadah di puncak beranda.
     2. **Sambutan Beranda** (`home_welcome`) — Foto seksi selamat datang.
     3. **Sekolah Sabat** (`sekolah_sabat`) — Foto seksi belajar Alkitab.
     4. **Tentang Kami** (`tentang_kami`) — Foto seksi komunitas jemaat.
2. **Interaksi:**
   - Preview thumbnail aktif saat ini.
   - Tombol **"Pilih dari Galeri"** untuk memilih foto dari galeri `media_assets`.
   - Tombol **"Unggah Foto Baru"** untuk mengunggah foto langsung yang otomatis masuk ke galeri dan terpasang ke seksi.
   - Tombol **"Reset ke Bawaan"** untuk menghapus konfigurasi kustom dan kembali ke fallback statis.

---

## 6. Integrasi Frontend Publik & Fallback Invariant

1. Halaman Beranda (`src/app/(public)/page.tsx` & komponen `Hero.jsx`, `WelcomeSection.jsx`):
   - Menerima data `sectionMedia` dari server-side fetch.
   - Menggunakan `sectionMedia.home_hero?.image_url || IMAGES.hero.src`.
   - Menggunakan `sectionMedia.home_welcome?.image_url || IMAGES.fellowship.src`.
2. Halaman Sekolah Sabat (`src/app/(public)/sekolah-sabat/page.tsx` & `SekolahSabatPage.jsx`):
   - Menggunakan `sectionMedia.sekolah_sabat?.image_url || IMAGES.bibleStudy.src`.
3. Halaman Tentang Kami (`src/app/(public)/tentang-kami/page.tsx` & `TentangKamiPage.jsx`):
   - Menggunakan `sectionMedia.tentang_kami?.image_url || IMAGES.community.src`.
4. **Fallback Invariant:**
   - Jika query database mengembalikan null/kosong/error, komponen secara mulus menggunakan gambar statis dari `frontend/src/data/content.js`. Tidak ada gambar yang rusak.

---

## 7. Rencana Pengujian (*Verification Plan*)

1. **Database & RLS Contract Tests:**
   - Migrasi berhasil diaplikasikan ke Supabase lokal.
   - Role `anon` hanya bisa membaca (`select`), staf `editor` dan `admin` bisa mengubah (`insert`/`update`/`delete`), non-staf ditolak.
2. **API & Route Contract Tests:**
   - Test endpoint `POST /api/staff/settings/section-media` dengan token staf valid dan tidak valid.
   - Test validasi `section_key` dan `asset_id`.
   - Test revalidasi cache publik.
3. **Public Component Integration Tests:**
   - Memastikan `Hero`, `WelcomeSection`, `SekolahSabatPage`, dan `TentangKamiPage` merender gambar kustom saat tersedia, dan fallback saat tidak tersedia.
4. **Visual Browser Verification:**
   - Membuka portal staf, mengganti gambar Hero Beranda dan Sambutan.
   - Membuka halaman beranda publik dan memverifikasi gambar berhasil diperbarui secara visual.
