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

## CI awal

Workflow Continuous Integration menjalankan:

- install deterministik dan production build frontend;
- instalasi dependency serta pemeriksaan sintaks backend.

Ketika refactor Next.js dan Supabase dimulai, workflow ini diperluas dengan typecheck, unit test, E2E, migration/RLS test, dan pemeriksaan lint. Status CI harus menjadi required check melalui GitHub ruleset setelah repository sudah terhubung.

## Perlindungan GitHub yang perlu diaktifkan

Pada repository GitHub:

1. Buat ruleset untuk main: block direct push, require pull request, require CI, dan batasi merge ke development.
2. Buat ruleset untuk development: block direct push, require pull request, dan require CI.
3. Aktifkan penghapusan branch setelah pull request merged.
4. Jangan menyimpan secret, file .env, backup, atau data jemaat di Git.
