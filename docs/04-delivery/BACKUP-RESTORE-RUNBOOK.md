# Runbook Backup dan Pemulihan

## Tujuan dan pemilik

Backup melindungi data gereja, bukan sekadar database. Pemilik backup ditunjuk Admin gereja; akses minimal dua penanggung jawab yang dipercaya dan disimpan pada daftar akses terbatas.

## Jadwal

| Waktu | Cakupan |
| --- | --- |
| Bulanan | Database dan manifest media/konfigurasi yang diperlukan |
| Sebelum migration berisiko | Database penuh dan catatan versi aplikasi |
| Sebelum hard delete material | Record relevan dan keputusan Admin |
| Enam bulanan | Restore drill pada lingkungan nonproduksi |

## Prosedur backup

1. Catat waktu, project target, commit aplikasi, dan migration terakhir.
2. Export database melalui mekanisme Supabase/Postgres yang sesuai dan terverifikasi.
3. Buat manifest object Storage yang mencatat path, ukuran, checksum bila tersedia, dan status consent; object sendiri dibackup sesuai kebutuhan/kebijakan.
4. Enkripsi arsip sebelum meninggalkan lingkungan tepercaya. Password/encryption key hanya disimpan pada vault, tidak pada nama file atau repository.
5. Simpan di lokasi yang dikelola gereja dengan akses terbatas dan redundansi yang disetujui.
6. Catat checksum, lokasi logical, retensi, dan penanggung jawab. Jangan menyertakan doa/nomor kontak dalam catatan terbuka.

## Salinan kedua arsip terenkripsi

Salin file `.tar.age` utuh ke lokasi kedua yang disetujui pemilik backup, misalnya penyimpanan gereja dengan akses terbatas atau media eksternal. Folder lain pada laptop yang sama belum memberi redundansi perangkat. Tujuan salinan belum ditetapkan per 18 Oktober 2026; jangan menganggap unggahan atau salinan sudah tersedia.

Perintah PowerShell 5.1 berikut dijalankan pemilik backup setelah folder tujuan tersedia dan disetujui. Perintah hanya membaca dan menyalin ciphertext, tanpa dekripsi atau akses private key. Jika file tujuan sudah ada, perintah memverifikasi file itu tanpa menimpanya.

```powershell
$backupSource = Join-Path $env:USERPROFILE 'rinegetan-backups'
$backupDestination = Read-Host 'Folder tujuan kedua yang telah disetujui dan tersedia'
if ([string]::IsNullOrWhiteSpace($backupDestination)) { throw 'Tujuan belum diisi.' }
if (-not (Test-Path -LiteralPath $backupDestination -PathType Container)) { throw 'Folder tujuan belum tersedia.' }
$backupSource = (Resolve-Path -LiteralPath $backupSource).Path
$backupDestination = (Resolve-Path -LiteralPath $backupDestination).Path
if ($backupSource -eq $backupDestination) { throw 'Tujuan harus berbeda dari sumber.' }
$backupFiles = @(
    @{ Name = 'rinegetan-20261013T135853Z.tar.age'; Hash = '029b4835a51e3ec19c8b06cfbf362bb3170b3278d119692dea7e431df7f7ee25' },
    @{ Name = 'rinegetan-20261015T033323Z.tar.age'; Hash = '06c4cf9d198f2ed50288a944742fd317be99b656b87d4a1278272881a15153fc' }
)
foreach ($backupFile in $backupFiles) {
    $sourceFile = Join-Path $backupSource $backupFile.Name
    $destinationFile = Join-Path $backupDestination $backupFile.Name
    $sourceHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256 -ErrorAction Stop).Hash
    if ($sourceHash -ne $backupFile.Hash) { throw ('Checksum sumber berbeda: ' + $backupFile.Name) }
    if (-not (Test-Path -LiteralPath $destinationFile)) {
        Copy-Item -LiteralPath $sourceFile -Destination $destinationFile -ErrorAction Stop
    }
    $destinationHash = (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256 -ErrorAction Stop).Hash
    if ($destinationHash -ne $sourceHash) { throw ('Checksum salinan berbeda: ' + $backupFile.Name) }
    Write-Output ($backupFile.Name + ' checksum cocok')
}
```

Jika tujuan memakai sinkronisasi cloud, tunggu sinkronisasi selesai lalu verifikasi hash salinan yang diunduh ulang pada lingkungan tepercaya. Catat tanggal, dua nama arsip, SHA-256, lokasi logical, penanggung jawab, dan konfirmasi akses; jangan menaruh path pribadi, tautan privat, atau identitas jemaat di delivery record. Checksum cocok membuktikan integritas byte salinan, bukan kemampuan dekripsi atau keberhasilan restore. Bukti restore lama tetap mengacu ke [drill P2-502](records/P2-502-2026-10-15.md).

## Pemegang kunci kedua dan backup berikutnya

1. Gereja menunjuk pemegang kedua. Ia membuat key `age` pada perangkat tepercaya miliknya sendiri dan menyimpan private key secara aman pada perangkat/vault miliknya, terpisah dari arsip.
2. Hanya **public recipient** yang disampaikan kepada operator backup melalui saluran yang disetujui. Cocokkan public recipient dengan pemegangnya. Jangan menyalin private key ke laptop operator, chat, repository, atau alat bantu agent.
3. Operator mengenkripsi backup berikutnya kepada dua public recipient dalam satu arsip `age` (opsi `-r` untuk masing-masing recipient). Hindari mengubah atau menimpa dua arsip historis; penambahan pemegang kedua tidak otomatis membuatnya dapat mendekripsi arsip lama.
4. Tiap pemegang menguji kemampuan dekripsinya sendiri di lingkungan tepercaya tanpa membuka key kepada operator/agent. Catat hasil dan waktu saja, lalu hapus plaintext sesuai prosedur restore.
5. Buat backup baru sebelum perubahan schema berikutnya. Dua arsip historis di atas dibuat sebelum migration 17–18 Oktober 2026; checksum yang cocok tidak membuat cakupannya menjadi mutakhir.

## Restore drill

1. Pilih backup yang telah disetujui dan environment nonproduksi kosong.
2. Validasi checksum dan decrypt di lingkungan tepercaya.
3. Restore database lalu migrasikan hanya jika runbook skenario mengharuskannya.
4. Cocokkan row count kategori non-sensitif, migration version, kebijakan RLS, serta sampling media manifest.
5. Uji sign-in staf dummy, konten Published, dan penolakan akses privat untuk non-Admin.
6. Hapus lingkungan restore mengikuti kebijakan setelah verifikasi dan catat durasi, masalah, serta tindakan.

## Catatan teknis restore (dari drill P2-502, 15 Okt 2026)

- **Samakan versi platform dulu.** Supabase meng-upgrade Auth/Storage production otomatis. Cek versi production (`GET /auth/v1/health` dengan publishable key, `GET /storage/v1/version`), tulis ke `supabase/.temp/gotrue-version` dan `storage-version`, lalu `supabase stop --no-backup` dan `start`. Tunggu sampai jumlah `auth.schema_migrations` sama dengan production sebelum memuat data.
- **Kolom yang belum ada di image lokal** boleh dibuang dari blok `COPY` hanya bila seluruh nilainya NULL/kosong; jika ada nilai, hentikan drill dan catat.
- **Muat data sebagai `supabase_admin`** dalam satu transaksi (`psql --single-transaction -v ON_ERROR_STOP=1`) dan awali dengan `truncate storage.buckets cascade;` karena migration sudah membuat bucket.
- **Media:** `supabase storage cp` per objek dengan path tujuan relatif (path Windows absolut ditolak). Unggah ke Storage lokal lalu cocokkan SHA-256 dengan manifest.
- **Git Bash:** set `MSYS_NO_PATHCONV=1` saat memanggil `podman exec`/`podman cp` agar `/tmp/...` tidak diubah menjadi path Windows.
- **Login email lokal mati** (`enable_signup = false` → provider email nonaktif di CLI). Uji RLS dengan JWT yang ditandatangani JWT secret lokal untuk akun uji.
- Setelah verifikasi: `supabase stop --no-backup` dan hapus semua file hasil dekripsi.

## Pemulihan insiden nyata

Restorasi production adalah keputusan Admin/pimpinan gereja. Tentukan:

- titik waktu pemulihan;
- data yang berisiko hilang/dikembalikan;
- siapa yang mendapat akses;
- komunikasi kepada pihak terdampak bila diperlukan;
- langkah validasi dan monitoring sesudah restore.

Jangan melakukan restore production hanya untuk memperbaiki bug aplikasi yang dapat diperbaiki dengan migration forward atau rollback deployment.
