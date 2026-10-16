# Spesifikasi Desain P2-302: Jadwal WITA dan Exception

- **Issue:** P2-302 — Jadwal WITA dan exception
- **Sprint:** 3
- **Status:** Draf Desain Disetujui
- **Tanggal:** 2026-09-17
- **Base Branch:** `development`
- **Branch Fitur:** `feature/p2-302-wita-schedules-exceptions`
- **Zona Waktu:** `Asia/Makassar` (WITA, UTC+8)

---

## 1. Latar Belakang & Tujuan

Jemaat GMAHK Rinegetan di Tondano, Minahasa, memiliki agenda ibadah rutin mingguan (Sekolah Sabat, Ibadah Sabat & Khotbah, Vesper Pemuda hari Jumat, dan Kebaktian Doa hari Rabu) serta agenda pada hari-hari lain yang dapat berulang secara mingguan.

Sesuai dengan panduan operasional pada `CONTENT-OPERATIONS.md`:
- Jadwal rutin mingguan menggunakan model `schedules` (berdasarkan hari dalam pekan, `0` untuk Minggu s/d `6` untuk Sabat/Sabtu).
- Pengecualian pada tanggal spesifik (libur, ibadah gabungan, perubahan jam, pemindahan lokasi, atau jadwal ibadah insidental satu kali) ditangani melalui `schedule_exceptions`.
- Sistem tidak membuat duplikasi jadwal mingguan untuk satu pengecualian tanggal.
- Seluruh penanggalan dan waktu publik dikunci pada zona waktu `Asia/Makassar` (WITA).

---

## 2. Skema Database PostgreSQL

### 2.1. Tabel `public.schedules` (Master Jadwal Mingguan)

```sql
CREATE TABLE public.schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone,
    timezone text NOT NULL DEFAULT 'Asia/Makassar',
    location text NOT NULL DEFAULT 'Gereja GMAHK Rinegetan',
    description text,
    category text NOT NULL DEFAULT 'Ibadah',
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    status public.content_status NOT NULL DEFAULT 'draft',
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_schedules_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT chk_schedules_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT chk_schedules_timezone CHECK (timezone = 'Asia/Makassar'),
    CONSTRAINT chk_schedules_time_order CHECK (end_time IS NULL OR end_time > start_time)
);
```

#### Indeks `schedules`:
- `idx_schedules_lookup`: `(status, day_of_week, position)`
- `idx_schedules_slug`: `(slug)` UNIQUE
- `idx_schedules_department`: `(department_id)`

---

### 2.2. Tabel `public.schedule_exceptions` (Pengecualian Per Tanggal)

```sql
CREATE TABLE public.schedule_exceptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
    exception_date date NOT NULL,
    action text NOT NULL,
    custom_name text,
    custom_start_time time without time zone,
    custom_end_time time without time zone,
    custom_location text,
    reason text,
    status public.content_status NOT NULL DEFAULT 'published',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_schedule_exceptions_action CHECK (action IN ('cancelled', 'override', 'added')),
    CONSTRAINT chk_schedule_exceptions_cancelled CHECK (
        action != 'cancelled' OR schedule_id IS NOT NULL
    ),
    CONSTRAINT chk_schedule_exceptions_override CHECK (
        action != 'override' OR (
            schedule_id IS NOT NULL AND (
                custom_name IS NOT NULL OR
                custom_start_time IS NOT NULL OR
                custom_location IS NOT NULL
            )
        )
    ),
    CONSTRAINT chk_schedule_exceptions_added CHECK (
        action != 'added' OR (
            custom_name IS NOT NULL AND custom_start_time IS NOT NULL
        )
    ),
    CONSTRAINT chk_schedule_exceptions_time_order CHECK (
        custom_end_time IS NULL OR custom_start_time IS NULL OR custom_end_time > custom_start_time
    ),
    CONSTRAINT uq_schedule_exception_per_schedule_date UNIQUE (schedule_id, exception_date)
);
```

#### Indeks `schedule_exceptions`:
- `idx_schedule_exceptions_lookup`: `(exception_date, status)`
- `idx_schedule_exceptions_schedule`: `(schedule_id, exception_date)`

---

## 3. Hak Akses (Grants) dan Row-Level Security (RLS)

### 3.1. Deny-by-Default & Grants
- `ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.schedules FORCE ROW LEVEL SECURITY;`
- `ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.schedule_exceptions FORCE ROW LEVEL SECURITY;`
- `REVOKE ALL ON public.schedules, public.schedule_exceptions FROM PUBLIC, anon, authenticated;`
- `GRANT SELECT ON public.schedules, public.schedule_exceptions TO anon, authenticated;`
- `GRANT INSERT, UPDATE, DELETE ON public.schedules, public.schedule_exceptions TO authenticated;`

### 3.2. Policies

#### `public.schedules`:
- **SELECT**:
  ```sql
  CREATE POLICY schedules_select_policy ON public.schedules
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_editor_or_admin());
  ```
- **INSERT**:
  ```sql
  CREATE POLICY schedules_insert_policy ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_admin());
  ```
- **UPDATE**:
  ```sql
  CREATE POLICY schedules_update_policy ON public.schedules
  FOR UPDATE TO authenticated
  USING (public.is_editor_or_admin())
  WITH CHECK (public.is_editor_or_admin());
  ```
- **DELETE**:
  ```sql
  CREATE POLICY schedules_delete_policy ON public.schedules
  FOR DELETE TO authenticated
  USING (public.is_admin());
  ```

#### `public.schedule_exceptions`:
- **SELECT**:
  ```sql
  CREATE POLICY schedule_exceptions_select_policy ON public.schedule_exceptions
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_editor_or_admin());
  ```
- **INSERT**:
  ```sql
  CREATE POLICY schedule_exceptions_insert_policy ON public.schedule_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_admin());
  ```
- **UPDATE**:
  ```sql
  CREATE POLICY schedule_exceptions_update_policy ON public.schedule_exceptions
  FOR UPDATE TO authenticated
  USING (public.is_editor_or_admin())
  WITH CHECK (public.is_editor_or_admin());
  ```
- **DELETE**:
  ```sql
  CREATE POLICY schedule_exceptions_delete_policy ON public.schedule_exceptions
  FOR DELETE TO authenticated
  USING (public.is_admin());
  ```

---

## 4. Triggers & Audit Logging

### 4.1. Trigger `updated_at`
Trigger standard untuk memperbarui kolom `updated_at = now()` saat baris dimutasi.

### 4.2. Trigger Audit Log
Setiap mutasi (`INSERT`, `UPDATE`, `DELETE`) pada kedua tabel akan mencatat riwayat ke `public.audit_logs`:
- `entity_type`: `'schedule'` / `'schedule_exception'`
- `action`: `'created'` / `'updated'` / `'deleted'`
- `actor_id`: `auth.uid()`
- `payload`: rekaman JSON delta yang diredaksi.

---

## 5. Occurrence Resolution Engine & Tipe Frontend

### 5.1. Tipe TypeScript (`frontend/src/types/schedule.ts`)
- `DayOfWeek`: `0 | 1 | 2 | 3 | 4 | 5 | 6`
- `Schedule`: master jadwal mingguan.
- `ScheduleExceptionAction`: `'cancelled' | 'override' | 'added'`
- `ScheduleException`: pengecualian per tanggal.
- `ResolvedOccurrence`: representasi instans jadwal konkret pada tanggal tertentu:
  - `date`: string ISO `YYYY-MM-DD`
  - `name`: string nama kegiatan
  - `startTime`: format `"HH:MM"`
  - `endTime`: format `"HH:MM"` atau null
  - `location`: string lokasi
  - `category`: string kategori
  - `scheduleId`: uuid master (null jika one-off `added`)
  - `isCancelled`: boolean
  - `isOverridden`: boolean
  - `isAdded`: boolean
  - `reason`: string catatan/alasan jika ada

### 5.2. Utilitas Resolusi (`frontend/src/lib/schedule-wita.ts`)
- Konstanta `WITA_TIMEZONE = 'Asia/Makassar'`
- Mapping hari Bahasa Indonesia (`DAY_NAMES_ID`)
- `formatWitaTime(timeStr)`: Menghasilkan `"08.45 WITA"`
- `formatWitaDate(dateStr)`: Menghasilkan `"Sabtu, 19 September 2026"`
- `formatWitaRange(start, end)`: Menghasilkan `"08.45 – 10.00 WITA"`
- `resolveWeeklyOccurrences(schedules, exceptions, startDate, endDate)`:
  - Menghitung hari demi hari dalam rentang tanggal.
  - Memfilter jadwal yang aktif pada hari tersebut.
  - Menerapkan pembatalan, modifikasi waktu/tempat, atau jadwal tambahan khusus.
  - Mengembalikan daftar kronologis yang siap dikonsumsi UI.

---

## 6. Rencana Pengujian

1. **pgTAP Database Contract Tests (`supabase/tests/p2_302_schedules_schema.test.sql`):**
   - Keberadaan tabel, kolom, tipe, dan default value.
   - Constraint validasi: day_of_week (0-6), timezone ('Asia/Makassar'), slug regex, time ordering.
   - Constraint exception: cancelled, override, added integrity.
   - RLS deny-by-default: anon hanya melihat published; editor dapat create/update draft; editor dilarang DELETE permanen; admin dapat DELETE permanen.
   - Audit trigger mencatat mutasi schedules dan exceptions.

2. **Frontend Unit & Contract Tests (`frontend/tests/p2-302-schedule-wita.test.mjs`):**
   - Ekspansi mingguan 1-4 minggu menghasilkan urutan hari yang tepat.
   - Pembatalan Sabat pagi (`action = 'cancelled'`) menandai `isCancelled: true` dengan alasan.
   - Pergeseran jam Vesper Jumat (`action = 'override'`) memperbarui jam dan `isOverridden: true`.
   - Penambahan ibadah tengah pekan Selasa (`action = 'added'`) memunculkan kejadian baru `isAdded: true`.
   - Formatter waktu dan tanggal konsisten dalam WITA.
