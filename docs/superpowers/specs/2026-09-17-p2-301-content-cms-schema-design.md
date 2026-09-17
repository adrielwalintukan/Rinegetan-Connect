# P2-301 CMS Content Schema Database Design

**Status:** Disetujui pemilik project untuk ditulis sebagai spesifikasi pada 2026-09-17.

**Issue:** P2-301 — Schema CMS konten publik (Sprint 3)

---

## 1. Tujuan

Menyediakan fondasi skema database, otorisasi eksplisit, dan Row Level Security (RLS) untuk CMS konten publik GMAHK Rinegetan. Skema ini mencakup tiga entitas inti:
1. `departments` (Departemen pelayanan gereja)
2. `announcements` (Warta dan pengumuman jemaat)
3. `events` (Agenda dan kegiatan gereja)

Desain ini memastikan konten berstatus `draft` dan `archived` terlindungi dari akses publik, mutasi staf diaudit secara otomatis, dan editor dapat mengelola konten tanpa memiliki akses penghapusan permanen (hanya `admin`).

---

## 2. Batas Scope

### Dalam Scope:
- Migration SQL Supabase versi baru (`supabase/migrations/YYYYMMDDHHMMSS_p2_301_content_cms_schema.sql`).
- Tipe enum `public.content_status` (`draft`, `published`, `archived`).
- Tiga tabel publik: `public.departments`, `public.announcements`, `public.events`.
- Explicit grants (revoke default, grant minimal ke `anon` dan `authenticated`).
- Row Level Security (RLS) policies untuk `anon`, `editor`, dan `admin`.
- Helper / trigger audit log ke tabel `public.audit_logs` yang sudah ada dari P2-202.
- Trigger pembaruan `updated_at` otomatis.
- Test suite pgTAP di `supabase/tests/p2_301_content_schema.test.sql` untuk menguji allow/deny RLS.
- TypeScript database types dan boundary test di `frontend/`.

### Di Luar Scope:
- UI pengelolaan CMS staf (`/staff/cms/*`) — dikerjakan pada P2-303.
- Logika recurrence jadwal mingguan dan exception WITA — dikerjakan pada P2-302.
- Media Storage, upload file, dan galeri aset — dikerjakan pada Sprint 4 (P2-401–P2-404).
- Public Next.js fetching dan revalidation cache — dikerjakan pada P2-304.

---

## 3. Detail Model Data

### 3.1. Enum `public.content_status`
```sql
CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
```

### 3.2. Tabel `public.departments`
Menyimpan daftar departemen pelayanan GMAHK Rinegetan (misal: Komunikasi, Sekolah Sabat, Diakon, Pemuda Advent, dll).

| Kolom | Tipe | Constraint & Aturan |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, default `gen_random_uuid()` |
| `name` | TEXT | NOT NULL, trim tidak kosong, maks 100 karakter |
| `slug` | TEXT | NOT NULL UNIQUE, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `description` | TEXT | NULL |
| `status` | public.content_status | NOT NULL, default `'draft'` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `created_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |
| `updated_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |

### 3.3. Tabel `public.announcements`
Menyimpan warta jemaat dan pengumuman resmi berkala.

| Kolom | Tipe | Constraint & Aturan |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, default `gen_random_uuid()` |
| `title` | TEXT | NOT NULL, trim tidak kosong, maks 200 karakter |
| `slug` | TEXT | NOT NULL UNIQUE, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `summary` | TEXT | NOT NULL, maks 500 karakter |
| `body` | TEXT | NOT NULL |
| `department_id` | UUID | NULL, REFERENCES `public.departments(id)` ON DELETE SET NULL |
| `status` | public.content_status | NOT NULL, default `'draft'` |
| `published_at` | TIMESTAMPTZ | NULL (diisi saat pertama kali atau setiap kali berstatus `published`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `created_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |
| `updated_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |

### 3.4. Tabel `public.events`
Menyimpan agenda kegiatan gereja (kebaktian Sabat khusus, seminar, bakti sosial, rapat, dll).

| Kolom | Tipe | Constraint & Aturan |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, default `gen_random_uuid()` |
| `title` | TEXT | NOT NULL, trim tidak kosong, maks 200 karakter |
| `slug` | TEXT | NOT NULL UNIQUE, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `summary` | TEXT | NOT NULL, maks 500 karakter |
| `body` | TEXT | NULL |
| `starts_at` | TIMESTAMPTZ | NOT NULL |
| `ends_at` | TIMESTAMPTZ | NOT NULL, `CHECK (ends_at >= starts_at)` |
| `all_day` | BOOLEAN | NOT NULL, default `false` |
| `timezone` | TEXT | NOT NULL, default `'Asia/Makassar'` |
| `venue` | TEXT | NOT NULL, default `'GMAHK Rinegetan'` |
| `department_id` | UUID | NULL, REFERENCES `public.departments(id)` ON DELETE SET NULL |
| `cover_asset_id`| UUID | NULL *(tanpa foreign key saat ini; FK ditambahkan saat tabel media_assets dibuat di P2-401)* |
| `status` | public.content_status | NOT NULL, default `'draft'` |
| `published_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `created_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |
| `updated_by` | UUID | NULL, REFERENCES `auth.users(id)` ON DELETE SET NULL |

---

## 4. Keamanan, Grants & RLS Matrix

### 4.1. Revoke & Minimal Grants
```sql
REVOKE ALL ON TABLE public.departments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.announcements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.events FROM PUBLIC, anon, authenticated;

-- Akses baca publik (hanya SELECT)
GRANT SELECT ON TABLE public.departments TO anon, authenticated;
GRANT SELECT ON TABLE public.announcements TO anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;

-- Akses mutasi staf authenticated (dibatasi oleh RLS)
GRANT INSERT, UPDATE, DELETE ON TABLE public.departments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
```

### 4.2. Matriks RLS

| Persona | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **`anon` (Publik)** | Hanya record dengan `status = 'published'` | Ditolak | Ditolak | Ditolak |
| **`editor`** | Seluruh record (`draft`, `published`, `archived`) | Diizinkan | Diizinkan | Ditolak (hanya soft archive melalui UPDATE) |
| **`admin`** | Seluruh record | Diizinkan | Diizinkan | Diizinkan (penghapusan permanen) |

### 4.3. Implementasi Policy
Menggunakan helper yang telah diverifikasi pada P2-202:
* `(SELECT private.is_admin())`
* `(SELECT private.is_editor_or_admin())`

Penyusunan permissive policies:
* **SELECT Policy:**
  - Diizinkan jika `status = 'published'` ATAU `(SELECT private.is_editor_or_admin())`.
* **INSERT Policy:**
  - Diizinkan hanya jika `(SELECT private.is_editor_or_admin())`.
* **UPDATE Policy:**
  - Diizinkan hanya jika `(SELECT private.is_editor_or_admin())`.
* **DELETE Policy:**
  - Diizinkan hanya jika `(SELECT private.is_admin())`.

---

## 5. Audit Logging Otomatis

Setiap mutasi pada ketiga tabel akan memicu function trigger internal `private.record_content_mutation_audit()`:
- Menangkap operasi: `INSERT`, `UPDATE`, `DELETE`.
- Mengisi `actor_id` dengan `auth.uid()`.
- Mengisi `action`:
  - `'content_created'` untuk INSERT.
  - `'content_status_changed'` jika `OLD.status IS DISTINCT FROM NEW.status`.
  - `'content_updated'` untuk UPDATE umum lainnya.
  - `'content_deleted'` untuk DELETE.
- Menyimpan diff perubahan yang relevan dalam format JSONB (tanpa payload rahasia).

---

## 6. Indeks Minimum

1. `CREATE INDEX idx_departments_status ON public.departments(status);`
2. `CREATE INDEX idx_announcements_status ON public.announcements(status);`
3. `CREATE INDEX idx_announcements_published_at ON public.announcements(published_at DESC) WHERE status = 'published';`
4. `CREATE INDEX idx_events_status_starts_at ON public.events(status, starts_at);`
5. `CREATE INDEX idx_events_department ON public.events(department_id);`

---

## 7. Rencana Pengujian

1. **pgTAP Database Test (`supabase/tests/p2_301_content_schema.test.sql`)**:
   - Uji verifikasi struktur tabel, kolom wajib, default value, dan tipe enum.
   - Uji constraint `ends_at >= starts_at` dan format regex slug.
   - Uji RLS `anon`:
     - Boleh `SELECT` published.
     - Ditolak `SELECT` draft dan archived.
     - Ditolak `INSERT`, `UPDATE`, `DELETE`.
   - Uji RLS `editor`:
     - Boleh `SELECT` draft, published, archived.
     - Boleh `INSERT` dan `UPDATE`.
     - Ditolak `DELETE`.
   - Uji RLS `admin`:
     - Boleh `DELETE`.
   - Uji pencatatan jejak mutasi ke `audit_logs`.
2. **Frontend Route & Boundary Verification**:
   - `npm run test:routes` memastikan rute publik Next.js tetap aman dan tidak bocor kredensial.
