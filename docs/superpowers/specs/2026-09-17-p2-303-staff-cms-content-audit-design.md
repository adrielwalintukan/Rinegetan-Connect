# Spesifikasi Desain P2-303: CMS Staf dan Audit Mutation

- **Issue:** P2-303 — CMS staf dan audit mutation
- **Sprint:** 3
- **Status:** Draf Desain Disetujui
- **Tanggal:** 2026-09-17
- **Base Branch:** `development`
- **Branch Fitur:** `feature/p2-303-staff-cms-content-audit`

---

## 1. Latar Belakang & Tujuan

Setelah skema database dan RLS untuk konten publik (`announcements`, `events`, `departments`) dan jadwal (`schedules`, `schedule_exceptions`) selesai dibangun di P2-301 dan P2-302, tahap berikutnya adalah menyediakan antarmuka manajemen konten (CMS) yang aman, efisien, dan ramah pengguna bagi staf gereja GMAHK Rinegetan di `/staff`.

Sesuai kriteria penerimaan P2-303:
1. **Editor:** Dapat membuat draft, mempublikasikan (*publish*), dan mengarsipkan (*archive*) konten pengumuman, kegiatan, dan jadwal, serta mengembalikan ke status sebelumnya.
2. **Admin:** Memiliki seluruh hak Editor, ditambah hak eksklusif untuk melakukan **penghapusan permanen (*permanent delete*)** dengan dialog konfirmasi dan pencatatan alasan (*reason*). Editor dilarang melakukan delete fisik.
3. **Audit Mutation:** Setiap mutasi konten menghasilkan rekaman terredaksi pada tabel `public.audit_logs`, dan staf dapat meninjau linimasa mutasi tersebut melalui tab Log Audit.
4. **Konsistensi UI:** Memanfaatkan Design System proyek (`container-site`, palet `navy`, `sabbath`, `cream`, komponen modular di `frontend/src/components/staff/`).

---

## 2. Arsitektur Otorisasi & Server Boundary

### 2.1. Otoritas Berdasarkan Peran Staf

| Aksi | Editor | Admin | Catatan Keamanan |
| --- | --- | --- | --- |
| **Lihat Konten (Draft, Published, Archived)** | Ya | Ya | Melalui RLS policy `*_select_policy` |
| **Buat Konten Baru (Draft / Published)** | Ya | Ya | Melalui RLS policy `*_insert_policy` |
| **Ubah Status (Draft ➔ Published ➔ Archived)** | Ya | Ya | Melalui RLS policy `*_update_policy` |
| **Edit Data Konten** | Ya | Ya | Melalui RLS policy `*_update_policy` |
| **Hapus Permanen (*Physical DELETE*)** | Tidak (Ditolak) | Ya | Dibatasi oleh `requireActiveAdmin` & `*_delete_policy` |
| **Melihat Linimasa Audit** | Ya | Ya | Dibatasi oleh RLS dan server guard |

### 2.2. API Routes / Server Mutation Handlers

Mutasi konten dijalankan melalui endpoint server yang aman di bawah `/api/staff/content`:
1. `POST /api/staff/content/status`
   - Payload: `{ entityType, id, status }`
   - Otorisasi: `requireActiveStaff(client)`
   - Status yang diizinkan: `'draft'`, `'published'`, `'archived'`
2. `POST /api/staff/content/save`
   - Payload: `{ entityType, id?, data }`
   - Otorisasi: `requireActiveStaff(client)`
   - Validasi data: judul wajib, slug URL-friendly, tanggal valid, status valid.
3. `POST /api/staff/content/delete`
   - Payload: `{ entityType, id, reason }`
   - Otorisasi: `requireActiveAdmin(client)` (wajib role Admin; throw 403 Forbidden jika role Editor).
   - Validasi: `reason` tidak boleh kosong (minimal 5 karakter).

---

## 3. Struktur Antarmuka Staf (`/staff`)

### 3.1. Halaman Utama Portal Staf (`frontend/src/app/staff/(protected)/page.tsx`)
Menggantikan placeholder dengan dasbor manajemen lengkap berbasis server-component yang mengambil data awal terautentikasi dan merender komponen interaktif:
- Mengambil sesi staf aktif (`role`, `user`).
- Mengambil ringkasan konten awal dari Supabase.
- Meneruskan data ke komponen `StaffDashboard`.

### 3.2. Komponen Modular di `frontend/src/components/staff/`

1. **`StaffDashboard.tsx` (Komponen Induk):**
   - Header dasbor: Nama portal, email pengguna, indikator role badge (`Admin` atau `Editor`), tombol `+ Tambah Konten`, dan form logout aman.
   - Bar navigasi tab:
     - 📢 **Pengumuman**
     - 📅 **Kegiatan**
     - ⏰ **Jadwal Mingguan**
     - 🏛️ **Departemen**
     - 📋 **Log Audit**
2. **`ContentFilterBar.tsx`:**
   - Filter pill status: **Semua**, **Draft**, **Published**, **Archived** beserta badge counter jumlah rekaman.
   - Input pencarian cepat berdasarkan judul.
3. **`ContentStatusBadge.tsx`:**
   - Badge visual dengan warna kontras yang jelas:
     - 🟡 Draft: `bg-amber-100 text-amber-800 border-amber-300`
     - 🟢 Published: `bg-emerald-100 text-emerald-800 border-emerald-300`
     - ⚪ Archived: `bg-slate-100 text-slate-700 border-slate-300`
4. **`ContentTable.tsx`:**
   - Tabel responsif menampilkan: Judul, Slug, Kategori/Departemen, Waktu WITA, Status Badge, dan Tombol Tindakan.
   - Tombol Tindakan Cepat (*Quick Actions*):
     - Ubah status: *Terbitkan* (jika Draft), *Arsipkan* (jika Published), *Jadikan Draft* (jika Archived).
     - Tombol *Edit* (membuka modal form).
     - Tombol *Hapus Permanen* (hanya tampil untuk role Admin).
5. **`ContentMutationDialog.tsx`:**
   - Modal form untuk menambah atau memperbarui rekaman konten dengan validasi masukan (judul, slug, ringkasan, isi, kategori, waktu WITA).
6. **`DeleteConfirmationDialog.tsx`:**
   - Modal konfirmasi destruktif khusus Admin.
   - Memuat teks peringatan bahaya dan input alasan (*reason*) sebelum tombol hapus aktif.
7. **`AuditLogViewer.tsx`:**
   - Menampilkan linimasa mutasi dari `public.audit_logs`: waktu WITA, aktor, entitas, jenis tindakan, dan rincian perubahan.

---

## 4. Logika Audit Mutation & Redaksi

### 4.1. Pencatatan Otomatis
- Trigger database `record_content_mutation_audit()` dan `record_schedule_mutation_audit()` secara otomatis mengisi:
  - `actor_id`: `auth.uid()`
  - `action`: `content.created`, `content.status_changed`, `content.updated`, `content.deleted`, `schedules.*`
  - `entity_type`: nama tabel
  - `entity_id`: UUID baris
  - `changes`: JSON delta ringkas.
- Alasan penghapusan Admin direkam ke dalam perubahan audit log untuk keperluan kepatuhan operasional gereja.

### 4.2. Pencegahan Kebocoran Sensitif
- Tidak ada token, secret key, atau data privat jemaat yang dicatat atau diekspos ke klien.
- Respons mutasi hanya mengembalikan data publik/staf terautentikasi.

---

## 5. Rencana Pengujian (Test Contracts)

1. **Server Service & Route Mutation Tests (`frontend/tests/p2-303-staff-cms-mutation.test.mjs`):**
   - Editor dapat mengubah status menjadi `published` dan `archived`.
   - Editor ditolak ketika mencoba menghapus permanen (error 403 Forbidden / `not_admin`).
   - Admin diizinkan melakukan penghapusan permanen dengan alasan yang valid.
   - Validasi data mutation: menolak status ilegal, slug tidak valid, atau penghapusan tanpa alasan.
   - Mutasi menghasilkan format audit log yang terredaksi tanpa informasi sensitif.
2. **Quality Gate Verification:**
   - `npm run test:routes` lulus 100%.
   - `npm run lint` lulus (0 errors, 0 warnings).
   - `npm run build` berhasil mengompilasi seluruh rute Next.js.
