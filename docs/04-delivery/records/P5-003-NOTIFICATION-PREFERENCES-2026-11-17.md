# P5-003 (issue #57) — Preference centre notifikasi perangkat (2026-11-17)

**Status:** Kode selesai, seluruh test lulus, **belum terverifikasi di production**. Migration `20261117000000` belum diterapkan ke project production, sehingga #57 **belum ditutup**.

Issue: [#57](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/57). Branch `feature/p5-003-notification-preferences`.

Rilis: PR #139 masuk `development` (`c1ed67d`).

## Keputusan pemilik yang mengikat

Issue #57 memerintahkan identitas langganan **tidak dikarang**. Pemilik menjawab pada 2026-11-17:

| Pertanyaan | Keputusan pemilik |
| --- | --- |
| Apa identitas langganan notifikasi? | **Perangkat / push subscription.** Tidak ada email, nomor, atau akun Member. |
| Dari mana preferensi diubah? | Dari perangkat yang berlangganan itu. |
| Apa arti "stop-all"? | Berhenti berlangganan di perangkat itu. |

Konsekuensi yang dipegang di seluruh kode: tidak ada satu pun kolom, field formulir, atau parameter API yang menerima email, nomor telepon, atau nama. Body yang membawa kunci seperti itu **ditolak**, bukan dibersihkan diam-diam — supaya route tidak pernah mulai mengumpulkan kontak tanpa keputusan baru.

## Yang dibangun

### Tiga route/modul dengan satu sumber kebenaran

| Berkas | Tanggung jawab |
| --- | --- |
| `src/lib/notifications/preferences.mjs` | `CATEGORIES`, `CONSENT_VERSION` (`2026-11-17`), normalisasi, `shouldDeliver`, `buildConsentRecord` |
| `src/lib/notifications/subscription.mjs` | Allow-list kunci, wajib `https://`, kategori terurut tetap, tolak kategori kosong |
| `src/lib/notifications/centre.mjs` | Salinan bahasa Indonesia, gerbang `canSubscribe`, penyusun body |
| `src/lib/notifications/store.mjs` | Preferensi perangkat di `localStorage` lewat external store |

### Dua route server

| Route | Perilaku |
| --- | --- |
| `POST /api/notifikasi/langganan` | `201` saat insert; `200` saat endpoint sudah ada (`23505`) dengan kategori diganti lewat RPC |
| `POST /api/notifikasi/berhenti` | RPC `stop_notification_subscription` |

Keduanya dibatasi `check_form_rate` **10 permintaan/jam** per IP ter-hash, **sebelum** menulis apa pun. Kunci push tidak pernah dikembalikan di respons.

### Halaman dan tautan

`/notifikasi` adalah halaman utilitas: `robots: { index: false }` dan **tidak** dimasukkan `sitemap.ts`, karena halaman `noindex` di dalam sitemap adalah kontradiksi yang dilaporkan Search Console sebagai error. Halaman tetap didaftarkan di `scripts/assert-public-route-contract.mjs` dan ditautkan dari footer (`data-testid="footer-link-notifikasi"`).

### Migration

`supabase/migrations/20261117000000_p5_003_notification_preferences.sql`:

- tabel `notification_subscriptions` (`endpoint` sebagai primary key, kategori dibatasi 1–4 nilai dari daftar tetap, tanpa duplikat)
- tabel `notification_consent_log` (mencatat **apa** yang disetujui, bukan **siapa**)
- trigger consent pada insert/update kategori, trigger `touch` untuk `updated_at`
- tiga fungsi `SECURITY DEFINER`: `update_notification_categories`, `stop_notification_subscription`, `notification_recipients`
- perluasan `form_rate_events_form_check` untuk `notification_subscribe`/`notification_stop`

## Keputusan implementasi (bukan keputusan pemilik)

| Keputusan | Alasan |
| --- | --- |
| Stop-all **menghapus baris** langganan, lalu mencatat consent `array[]::text[]` | Langganan yang tidak menerima apa pun bukan langganan; menyimpan kategori kosong membuat "aktif tapi bisu" yang tidak bisa dibedakan dari bug |
| Preferensi dibaca lewat `useSyncExternalStore` | `setState` di dalam effect ditolak lint `react-hooks/set-state-in-effect` dan menyebabkan render ganda; snapshot server harus stabil agar hidrasi cocok |
| `VAPID_PRIVATE_KEY` tidak dicantumkan di `.env.example` | File itu di-commit; placeholder pun mengundang kunci nyata masuk ke riwayat git |
| `PublicInputError` baru di `src/lib/api/errors.mjs` | Route dilarang mengirim `.message` mentah (kontrak P2-502), tetapi pesan validasi memang ditulis untuk jemaat. Tipe ini menandai pesan yang aman, dan route tetap melewati `publicErrorMessage` sebagai satu-satunya pintu keluar |

## Cacat nyata yang ditemukan CI, bukan diasumsikan

### Cacat 1: setiap insert gagal `42501` sebelum constraint dievaluasi

`supabase test db` gagal **9 subtest** dari 23 yang dilaporkan. Penyebabnya bukan logika kategori, melainkan grant:

```sql
revoke all on function private.notification_categories_unique(text[]) from public, anon, authenticated, service_role;
```

CHECK constraint dijalankan dengan hak role yang melakukan insert. Karena `service_role` ikut dicabut, insert mati dengan `42501: permission denied for function` **sebelum** constraint menilai baris. Semua assertion kategori dan endpoint tidak pernah tercapai.

Perbaikan mengikuti pola yang sudah dipakai P3-003 (`course_import_*`): cabut dari `public, anon, authenticated`, lalu **beri** `service_role`:

```sql
grant usage on schema private to service_role;
grant execute on function private.notification_categories_unique(text[]) to service_role;
```

`USAGE` pada skema `private` sebelumnya **tidak pernah** diberikan ke `service_role`, jadi `execute` saja tidak cukup — helper tetap tidak terjangkau.

### Cacat 2: test membaca tabel yang sengaja tidak boleh dibaca

Assertion consent log dijalankan sambil `set local role service_role`, padahal migration sengaja tidak memberi `SELECT` pada tabel itu. Test-nya sendiri yang salah: verifikasi dipindah ke pemilik test (`reset role`), dan justru ditambah assertion bahwa `service_role`, `anon`, dan `authenticated` **tidak** bisa membaca tabel tersebut.

### Penjaga baru

Test pgTAP sekarang mengunci bentuk grant: `service_role` **bisa** mengeksekusi helper, `anon` **tidak bisa**, dan `authenticated` tidak bisa memanggil `notification_recipients` maupun `update_notification_categories`.

## Verifikasi

### Lokal

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` (seluruh suite node) | **579/579** |
| `npm run typecheck` | bersih |
| `npm run lint` | bersih (0 error, 0 warning) |
| `npm run build` | berhasil; `/notifikasi` terdaftar sebagai halaman statis |
| `GET /notifikasi` pada build lokal | `200`; `noindex`, 4 kategori, stop-all, dan tautan footer semuanya ada |
| `POST /api/notifikasi/langganan` dengan kategori kosong | `400` "Pilih minimal satu kategori notifikasi." |
| `POST` dengan endpoint `http://` | `400` "Alamat langganan harus diawali https://." |
| `POST` dengan kunci `email` tambahan | `400` "Format permintaan tidak valid." |

Tiga POST terakhir memakai body yang **ditolak sebelum** menyentuh database, jadi tidak ada baris nyata yang tertulis.

### CI (semua lulus pada PR #139)

| Job | Hasil |
| --- | --- |
| Frontend Quality Gate & Build | pass |
| Database pgTAP & RLS Tests | pass (seluruh 39 assertion P5-003) |
| Browser regression (Playwright) | pass |
| Backend syntax | pass |

### Bukti test punya gigi (mutasi)

| Mutasi | Tertangkap oleh |
| --- | --- |
| Hapus allow-list kunci body | 2 test (`subscription`) |
| Matikan cek `https://` | 2 test |
| Izinkan kategori kosong di modul | 2 test |
| Hapus cek kategori kosong di `centre` | 1 test |
| Hapus cek `hasPushManager` | 1 test |
| Baca `localStorage` tanpa normalisasi | 2 test |
| `getServerSnapshot` mengembalikan objek baru | 1 test |
| Cabut `execute` helper dari `service_role` | CI pgTAP (9 subtest) |

Mutasi terakhir **tidak tertangkap lokal** karena Docker tidak tersedia. Itu dicatat sebagai batas, bukan diabaikan.

## Batas verifikasi

- **Belum terverifikasi di production.** Migration `20261117000000` belum diterapkan ke project production, dan tidak ada workflow yang menerapkannya. Sampai itu dilakukan manual, kedua route akan menjawab `503` (tanpa `SUPABASE_SECRET_KEY`) atau `500` (RPC belum ada). Karena acceptance menuntut preference centre dan audit consent **tersedia**, #57 belum ditutup.
- Kunci VAPID belum dibuat. Tanpa `NEXT_PUBLIC_VAPID_PUBLIC_KEY` dan `VAPID_PRIVATE_KEY` di environment production, `canSubscribe` mengembalikan alasan "Layanan notifikasi belum tersedia saat ini" dan tidak ada langganan yang bisa dibuat. Membuat kunci adalah tindakan pemilik, bukan tindakan otomatis.
- Belum ada pengirim notifikasi. Digest 07.00 WITA, cap 3/hari, retry 3×5 menit, dan retensi 90 hari adalah lingkup P5-004 (#58). `notification_recipients` sudah ada agar P5-004 tidak perlu mengubah skema, tetapi belum ada pemanggilnya.
- `OFFLINE_ENABLED` tetap `false`. Gate P4-005 tidak tersentuh.
- Preview Vercel pada PR #139 dilindungi login Vercel, sehingga verifikasi halaman dilakukan pada build lokal, bukan pada URL preview.

## Berkas

- `frontend/src/lib/notifications/{preferences,subscription,centre,store}.mjs` + shim `.ts`
- `frontend/src/app/api/notifikasi/{langganan,berhenti}/route.ts`
- `frontend/src/app/(public)/notifikasi/page.tsx`
- `frontend/src/components/notifications/NotificationCentre.tsx`
- `frontend/src/lib/api/errors.mjs` — tipe `PublicInputError`
- `frontend/src/components/layout/GlobalFooter.jsx` — tautan `/notifikasi`
- `frontend/scripts/assert-public-route-contract.mjs` — `/notifikasi` masuk kontrak rute
- `frontend/.env.example` — kunci VAPID publik dan subject, tanpa kunci privat
- `supabase/migrations/20261117000000_p5_003_notification_preferences.sql`
- `supabase/tests/p5_003_notification_preferences.test.sql` — 39 assertion pgTAP
- `frontend/tests/p5-003-notification-*.test.mjs` — 6 suite, 63 test
