# Design Specification: P2-304 Public Queries, Cache Revalidation, Empty States, and Metadata

## Overview

Issue **P2-304** melengkapi fase konten publik pada Sprint 3. Sistem menghubungkan halaman publik jemaat (`/`, `/kegiatan`, `/sekolah-sabat`, `/pelayanan`, `/tentang-kami`, `/media`, `/kontak`) ke database Supabase secara efisien, aman, dan ramah mesin pencari (SEO).

### Goals

1. **Security & Privacy Boundary**: Query publik hanya mengeksekusi dan menerima konten berstatus `published`. Tidak ada data `draft` atau `archived` yang pernah bocor ke publik, didukung ganda oleh query filter `.eq("status", "published")` dan RLS deny-by-default PostgreSQL.
2. **High Performance & Cache**: Memanfaatkan caching Next.js (`unstable_cache` dan ISR `revalidate: 60`) dengan tag revalidasi (`public-content`, `public-events`, `public-schedules`, `public-departments`, `public-announcements`).
3. **Instant On-Demand Invalidation**: Ketika staf melakukan mutasi konten (`save`, `status`, `delete`) di CMS, API mutasi server langsung memicu `revalidateTag` dan `revalidatePath` sehingga pengunjung publik melihat data terkini tanpa menunggu TTL habis.
4. **Resilient Pure Empty States**: Menyediakan komponen modular `frontend/src/components/ui/EmptyState.tsx` yang konsisten dengan Design System gereja (`navy`, `sabbath`, `cream`) ketika data kegiatan, jadwal, atau pengumuman belum tersedia atau kosong pada kategori tertentu.
5. **Standardized SEO Metadata**: Seluruh 7 rute publik mengekspor metadata terstruktur (Title, Description, OpenGraph `id_ID`, Twitter Cards, canonical URL).

---

## Architecture & Data Flow

```text
               ┌────────────────────────────────────────┐
               │         CMS Staff Mutation API         │
               │   (/api/staff/content/[save|status|del])│
               └───────────────────┬────────────────────┘
                                   │ 1. Tulis DB & Audit Log
                                   ├────────────────────────────────────┐
                                   ▼                                    ▼
                        ┌─────────────────────┐             ┌───────────────────────┐
                        │ Supabase PostgreSQL │             │ Next.js Revalidation  │
                        │ (announcements,     │             │ revalidateTag('...'), │
                        │  events, schedules, │             │ revalidatePath('...') │
                        │  departments)       │             └───────────────────────┘
                        └──────────▲──────────┘
                                   │ 3. Fetch on cache-miss / expired
                        ┌──────────┴──────────┐
                        │  queries.ts (Server)│
                        │  unstable_cache +   │
                        │  .eq('published')   │
                        └──────────▲──────────┘
                                   │ 2. Read cached / fresh data
                        ┌──────────┴──────────┐
                        │   Public Routes     │
                        │   (Server Components)│
                        │   /, /kegiatan, dll.│
                        └──────────┬──────────┘
                                   │ Props (data / empty)
                                   ▼
                        ┌─────────────────────┐
                        │  UI & EmptyState    │
                        │  (Client/Present.)  │
                        └─────────────────────┘
```

### 1. Public Query Module (`frontend/src/lib/public/queries.ts`)

Modul ini mengeksekusi query publik menggunakan client Supabase anonim publik murni (`createClient` dengan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Karena modul ini tidak memanggil `cookies()`, Next.js tidak melakukan *dynamic render bailout*, memungkinkan respons di-cache secara static maupun via ISR.

Fungsi utama yang diekspor:
- `getPublishedAnnouncements()`:
  - Query: `from("announcements").select("*").eq("status", "published").order("created_at", { ascending: false })`
  - Cache Tags: `["public-content", "public-announcements"]`
- `getPublishedEvents()`:
  - Query: `from("events").select("*").eq("status", "published").order("start_date", { ascending: true })`
  - Cache Tags: `["public-content", "public-events"]`
- `getPublishedSchedules()`:
  - Query: `from("schedules").select("*").eq("status", "published")` dan `from("schedule_exceptions").select("*")`
  - Memproses hasil dengan engine `resolveWeeklyOccurrences(schedules, exceptions, startDate, endDate)` dari `schedule-wita.ts`.
  - Cache Tags: `["public-content", "public-schedules"]`
- `getPublishedDepartments()`:
  - Query: `from("departments").select("*").eq("status", "published").order("display_order", { ascending: true })`
  - Cache Tags: `["public-content", "public-departments"]`

Setiap pemanggilan dibungkus dengan `unstable_cache` dan konfigurasi `revalidate: 60`.

### 2. Cache Revalidation Hooks

Di dalam route handler mutasi:
- `frontend/src/app/api/staff/content/status/route.ts`
- `frontend/src/app/api/staff/content/save/route.ts`
- `frontend/src/app/api/staff/content/delete/route.ts`

Setelah mutasi sukses dan audit log tercatat, fungsi helper `triggerPublicRevalidation(entityType)` dipanggil:
```ts
export function triggerPublicRevalidation(entityType: string) {
  try {
    revalidateTag("public-content");
    revalidateTag(`public-${entityType}`);
    revalidatePath("/");
    if (entityType === "events") revalidatePath("/kegiatan");
    if (entityType === "schedules") revalidatePath("/sekolah-sabat");
    if (entityType === "departments") revalidatePath("/pelayanan");
  } catch (error) {
    console.error("Failed to revalidate cache tags:", error);
  }
}
```

---

## Component Design

### 1. `frontend/src/components/ui/EmptyState.tsx`

Komponen modular dan konsisten dengan Design System gereja:
```tsx
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  testId?: string;
}
```
- **Visual styling**:
  - Container berlatar `bg-white` atau `bg-sabbath-50/50`, rounded-2xl, border `border-navy/10`.
  - Ikon berwadah bulat `bg-sabbath-100 text-sabbath-700`.
  - Judul `font-semibold text-navy text-lg sm:text-xl`.
  - Deskripsi `text-sm text-slate-600 max-w-md mx-auto leading-relaxed`.
  - Tombol aksi opsional bergaya `btn-secondary` atau `btn-primary`.

### 2. Page & Section Integrations

- **`frontend/src/app/(public)/page.tsx` (Beranda)**:
  - Memanggil `getPublishedAnnouncements()`, `getPublishedEvents()`, `getPublishedSchedules()`.
  - Mengirimkan data ke `HomePage` atau seksi-seksinya.
  - Jika belum ada kegiatan, `EventsSection` menampilkan `EmptyState` yang menyatakan agenda mendatang sedang dipersiapkan.
- **`frontend/src/app/(public)/kegiatan/page.tsx` (Kegiatan)**:
  - Memanggil `getPublishedEvents()`.
  - Menyediakan filter kategori interaktif. Jika hasil filter kosong atau daftar awal kosong, merender `EmptyState`.
- **`frontend/src/app/(public)/sekolah-sabat/page.tsx` (Sekolah Sabat & Jadwal)**:
  - Memanggil `getPublishedSchedules()`.
  - Merender jadwal mingguan terformat WITA. Jika tidak ada jadwal, merender `EmptyState`.
- **`frontend/src/app/(public)/pelayanan/page.tsx` (Pelayanan)**:
  - Memanggil `getPublishedDepartments()`.
  - Merender kartu departemen aktif. Jika kosong, merender `EmptyState`.

---

## SEO Metadata Standardization

Setiap rute publik mendefinisikan objek `metadata: Metadata` lengkap:
1. **Root Layout (`frontend/src/app/layout.tsx`)**:
   - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rinegetan-connect.vercel.app')`
   - Default title template: `%s | GMAHK Rinegetan`
   - OpenGraph site name, locale `id_ID`, type `website`
2. **Page Metadatas**:
   - `/`: Title *"GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama"*
   - `/tentang-kami`: Title *"Tentang Kami — Sejarah & Visi Jemaat"*
   - `/kegiatan`: Title *"Agenda & Kegiatan Jemaat"*
   - `/media`: Title *"Media & Galeri Jemaat"*
   - `/pelayanan`: Title *"Departemen & Pelayanan Jemaat"*
   - `/sekolah-sabat`: Title *"Sekolah Sabat & Jadwal Ibadah WITA"*
   - `/kontak`: Title *"Kontak & Lokasi Gereja"*

---

## Testing & Quality Gate Plan

1. **Automated Contract Test**: `frontend/tests/p2-304-public-queries-metadata.test.mjs`
   - Menguji bahwa modul query publik selalu menyaring `.eq("status", "published")`.
   - Menguji bahwa helper revalidasi memanggil `revalidateTag` dan `revalidatePath`.
   - Menguji bahwa seluruh 7 halaman publik memiliki file rute dan metadata yang valid.
   - Menguji bahwa komponen `EmptyState` diekspor dan memiliki antarmuka yang benar.
2. **Regression & Quality Gate Verification**:
   - `npm --prefix frontend run test:routes` (seluruh 50+ pengujian lulus)
   - `npm --prefix frontend run lint` (0 error, 0 warning)
   - `npm --prefix frontend run build` (19 rute App Router terkompilasi bersih)
