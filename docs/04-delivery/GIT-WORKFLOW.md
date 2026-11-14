# Git dan Pull Request Workflow

## Branch utama

| Branch | Fungsi | Aturan merge |
| --- | --- | --- |
| main | Rilis stabil | Hanya pull request dari development setelah checklist rilis lulus |
| development | Integrasi pekerjaan aktif | Hanya pull request dari branch fitur/fix/chore dengan CI hijau |

Tidak ada push langsung ke main atau development. Semua pekerjaan baru memakai branch turunan dari development.

## Penamaan branch

Gunakan salah satu bentuk berikut:

- feature/<ringkasan-singkat>
- fix/<ringkasan-singkat>
- chore/<ringkasan-singkat>
- docs/<ringkasan-singkat>

Contoh:

~~~text
feature/staff-auth-foundation
feature/content-cms-schema
fix/mobile-gallery-overflow
chore/bootstrap-phase-2
~~~

## Alur kerja

1. Perbarui development.
2. Buat branch kecil dari development.
3. Kerjakan satu tujuan yang terukur, dengan test-first untuk perubahan perilaku.
4. Push branch dan buka pull request menuju development.
5. CI harus hijau; review PR memeriksa scope, test, desain, RLS/privasi bila relevan, dan dokumentasi.
6. Merge ke development dengan riwayat yang mudah dibaca.
7. Saat kumpulan fitur siap dirilis, buka satu pull request development → main. Jalankan checklist rilis dan buat tag/release bila disetujui.

## CI

Workflow Continuous Integration berjalan pada pull request dan push ke `development` serta `main`, dengan lima job:

- **Frontend Quality Gate & Build:** install deterministik, typecheck, lint, production build, dan Node unit/contract/security test.
- **Database pgTAP & RLS Tests:** Supabase lokal, migration dari database kosong, dan suite pgTAP.
- **Browser regression (Playwright):** alur publik, aksesibilitas, reader, dan CMS staf di Chromium terhadap build production dengan Supabase lokal dan data sintetis. Rincian di [Strategi Pengujian](../06-quality/TEST-STRATEGY.md#regresi-browser-di-ci).
- **Backend syntax:** instalasi dependency dan pemeriksaan sintaks backend.
- **Release source branch:** pada pull request ke `main`, gagal bila branch asal bukan `development` milik repository ini; pada event lain langkahnya dilewati dan job tetap lulus.

Nama job di atas adalah nama check yang dipakai ruleset; ubah ruleset bila nama job berubah.

## Perlindungan GitHub

Diterapkan melalui OPS-GIT (#69) dengan repository rulesets; bukti di [catatan OPS-GIT](records/OPS-GIT-2026-10-24.md).

| Ruleset | Target | Aturan |
| --- | --- | --- |
| `development` | `refs/heads/development` | Wajib pull request (0 approval karena satu maintainer), blokir force push dan penghapusan, required checks: Frontend Quality Gate & Build, Database pgTAP & RLS Tests, Browser regression (Playwright), Backend syntax |
| `main` | `refs/heads/main` | Sama dengan `development`, ditambah required check Release source branch |

- Tidak ada bypass actor. Darurat hanya dengan mengubah ruleset oleh admin repository, lalu dicatat.
- Required checks dibatasi ke GitHub Actions dan tidak mewajibkan branch up to date, agar tidak memaksa update berulang.
- Penghapusan branch otomatis setelah merge aktif (`delete_branch_on_merge`). Branch `main` dan `development` tidak ikut terhapus karena ruleset memblokir penghapusannya.
- Jangan menyimpan secret, file .env, backup, atau data jemaat di Git.
