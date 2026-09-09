# Keamanan dan Privasi

## Klasifikasi data

| Kelas | Contoh | Pengendalian |
| --- | --- | --- |
| Publik | Pengumuman Published, jadwal, artikel, foto berizin | RLS read-only anon, validasi publish |
| Internal | Draft, audit ringkas, profil staf | RLS staf; least privilege |
| Privat pastoral | Permohonan doa, respons pastoral, data kunjungan | Admin saja; tidak dicari/diekspor Editor |
| Sensitif operasional | Password, access token, service-role key, SMTP key | Hanya secret manager/server; tidak pernah client/log |

## Auth dan staf

- Tidak ada pendaftaran publik maupun OAuth pada Phase 2.
- Admin pertama dibuat melalui dashboard Supabase oleh pemilik project dan dipetakan ke role Admin melalui migration/prosedur bootstrap yang terdokumentasi.
- Admin mengundang Editor; undangan mengarah ke set-password melalui alur Auth resmi.
- Reset password memakai email; tidak ada staf yang melihat atau menyalin password orang lain.
- Session dipastikan server-side untuk halaman staf; setiap operasi mutasi memverifikasi user, role, dan status aktif.
- Nonaktifkan staf dengan pencabutan role/status; jangan menghapus audit history.

## Proteksi form Phase 3

Semua form publik yang memproses data pastoral harus:

1. Menampilkan tujuan pemrosesan, periode retensi, dan checkbox persetujuan yang tidak tercentang default.
2. Divalidasi di server dengan schema yang ketat dan batas panjang.
3. Memverifikasi Cloudflare Turnstile di server; token tidak dianggap cukup di browser.
4. Memakai rate limit, honeypot, dan respons generik agar tidak menjadi oracle spam.
5. Tidak mengirim detail sensitif lewat email atau log. Email hanya memberi sinyal bahwa ada permintaan baru.

## Foto, anak, dan unduhan

- Setiap aset menyimpan bukti/rujukan persetujuan sebelum Published.
- Foto anak perlu izin orang tua/wali yang dicatat.
- Admin dapat hide aset seketika; query publik dan unduhan ZIP harus menghormati hidden/revoked state.
- Derivative publik adalah JPEG teroptimasi tanpa EXIF/geolocation. Original tidak disimpan pada pilot.
- Unduhan satu aset, album, atau kategori hanya memasukkan aset Published + approved consent + public_download_enabled.
- Job ZIP memiliki batas jumlah file/ukuran, rate limit, masa hidup singkat, dan URL bertanda tangan pendek bila Storage dipakai.

## RLS, key, dan secrets

- Aktifkan RLS dan grants minimum pada semua tabel exposed.
- Publishable key boleh berada di aplikasi; service-role key hanya server/Edge Function.
- Jangan percaya role dari browser atau user_metadata.
- Storage buckets memakai policy terpisah dari metadata tabel.
- Secret environment dimasukkan langsung ke provider, tidak ke repository, fixture, atau dokumentasi nilai nyata.
- Rotasi key bila terpapar, lalu audit logs dan deployment history.

## Retensi, backup, dan pemulihan

- Doa, pengunjung, dan lead: review/hapus default setelah 24 bulan; Admin dapat mengubah retensi untuk kebutuhan pastoral yang terdokumentasi.
- Konten publik archived tetap dipertahankan hingga Admin melakukan penghapusan sesuai kebijakan.
- Backup manual terenkripsi: bulanan dan sebelum migration yang mengubah struktur/data.
- Backup dikuasai gereja pada lokasi akses-terbatas. Catat tanggal, cakupan, checksum, penyimpanan, dan penanggung jawab.
- Uji pemulihan minimal setiap enam bulan pada lingkungan nonproduksi; catat hasil dan perbaikan.

## Insiden

1. Hentikan akses yang diduga bocor: cabut role, rotate secret, atau nonaktifkan endpoint sesuai dampak.
2. Lindungi bukti: audit log, deployment reference, waktu, dan cakupan; jangan menyebarkan PII.
3. Nilai data yang terkena dan informasikan pimpinan gereja sesuai prosedur internal.
4. Perbaiki policy/kode, tambahkan test regresi, lalu review ulang sebelum membuka layanan.

## Gate sebelum produksi

- Domain dan sender email resmi tersedia; SPF/DKIM/DMARC dinilai.
- Project production/backup/restore telah diuji.
- Privacy notice, consent copy, dan kontak pengelola data disetujui gereja.
- RLS test, dependency scan, dan kontrol akses Admin disetujui.
- Penggunaan Vercel dan Supabase sesuai paket/anggaran yang berlaku.
