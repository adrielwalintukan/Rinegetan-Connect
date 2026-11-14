# P3-006 Retensi dan Respons Pastoral — Rencana Implementasi

Desain: [spec](../specs/2026-11-03-p3-006-pastoral-retention-design.md). Issue #49. Branch `feature/p3-006-pastoral-retention` dari `development` (`9a93f27`).

## Batas

- Tanpa tabel/kolom baru, grant `DELETE`, ekspor, ubah retensi, status baru, pg_cron, atau dependency baru.
- Audit hanya berisi jumlah, cut-off, dan status; tanpa id baris, nama, kontak, isi.

## Langkah

1. **Migration** `supabase/migrations/20261103010000_p3_006_pastoral_retention.sql`: `private.pastoral_retention_cutoff()`, `public.expired_pastoral_counts()`, `public.purge_expired_pastoral_data()`, `public.record_pastoral_access(int, int, int)`. SECURITY DEFINER, `search_path = ''`, cek `private.is_admin()` → `42501`, revoke `public`/`anon`/`service_role`, grant `authenticated`.
2. **pgTAP** `supabase/tests/p3_006_pastoral_retention.test.sql`: fixture sintetis dibuat mundur (`session_replication_role = replica` agar trigger tidak memaksa `created_at`) di kedua sisi cut-off untuk ketiga tabel; penolakan anon/service_role/Editor/Admin nonaktif; purge menghapus hanya yang lewat cut-off; audit purge (termasuk 0) dan `pastoral.viewed` tanpa isi; nilai di luar 0-50 ditolak.
3. **Server**: helper di `lib/forms/pastoral-admin.mjs` (+ `.ts`), `loadAuditLogs` memisah `pastoral.viewed`, route `POST /api/staff/pastoral-retention`, `page.tsx` fail-closed setelah audit akses.
4. **UI**: `PastoralRetentionPanel` dan daftar **Akses data pastoral** di tab Log Audit.
5. **Tes Node**: helper, route, audit loader, kontrak fail-closed `page.tsx`.
6. **Dokumen**: runbook, DATA-MODEL-AND-RLS, SECURITY-PRIVACY, CONTENT-OPERATIONS, ISSUE-BACKLOG, ROADMAP, record P3-006.
7. **Verifikasi**: `npm run test`, `npm run typecheck`, `npm run lint` di `frontend/`, `npm run supabase -- test db`; PR ke `development`, CI 5/5.
