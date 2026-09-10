# Arsip aplikasi lama

`phase-1-web/` adalah snapshot aplikasi React/CRACO Phase 1 yang dipertahankan sebagai referensi rollback. Direktori ini bersifat read-only untuk pekerjaan Phase 2: jangan menambah fitur, dependency, atau konfigurasi deployment baru di dalamnya.

CI dan deployment sekarang menargetkan aplikasi Next.js di `../frontend/`. Jika rollback diperlukan, lakukan melalui pull request yang ditinjau—jangan mengembalikan direktori ini secara manual atau menghapus aplikasi Next.js.

Template `backend/` tetap berada di root sampai foundation Supabase (migrasi, RLS, dan test policy) tervalidasi. Ia belum menjadi bagian dari arsip ini.
