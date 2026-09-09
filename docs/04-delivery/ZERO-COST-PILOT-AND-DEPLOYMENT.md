# Pilot Tanpa Biaya dan Deployment

## Posisi saat ini

Platform dapat dibangun dan diuji sebagai pilot tanpa biaya, tetapi tidak boleh diposisikan sebagai produksi penuh sampai domain, pengirim email, backup, kepatuhan paket, dan kapasitas dinilai ulang. Harga/kuota penyedia dapat berubah; periksa [Supabase Pricing](https://supabase.com/pricing) dan syarat Vercel saat akan rilis.

## Batas pilot yang disetujui

| Area | Aturan pilot |
| --- | --- |
| Database | Supabase Free, project Singapore baru; project Tokyo lama tetap tidak diubah |
| Storage | Kuota operasional internal 1 GB; hanya JPEG derivative teroptimasi, tanpa original |
| Media video | Embed/link YouTube, tidak mengunggah video ke Storage |
| Hosting | Vercel Hobby hanya bila penggunaan sesuai syarat saat itu |
| Email | Konfigurasi pilot terbatas; sender domain resmi setelah domain tersedia |
| Notifikasi | Ditunda; tidak ada WhatsApp atau push live |
| Backup | Manual terenkripsi bulanan dan sebelum migration |

## Lingkungan

- Development: data sintetis, akun staf pengujian, bucket nonpublik, dan migration lokal/preview.
- Production: project Supabase Singapore, Vercel project produksi, secret terpisah, data gereja nyata.
- Jangan mencampur data pastoral produksi ke development atau preview deployment.
- Rekam project reference di vault operasional setelah proyek dibuat, bukan di repository.

## Konfigurasi environment

Nama variabel yang diizinkan:

~~~text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
RESEND_API_KEY
SENTRY_DSN
~~~

Tidak semua variabel diaktifkan pada Phase 2. Variabel rahasia diisi pada dashboard hosting, tidak pernah di commit. Client hanya dapat mengakses variabel yang memang diawali NEXT_PUBLIC dan bukan rahasia.

## Ambang operasi

- Warning storage pada 70%, freeze upload non-kritis pada 85%, dan rapat keputusan kapasitas sebelum 95%.
- Pantau egress dan ukuran ZIP. Batasi jumlah/ukuran aset per request dan beri pesan yang menjelaskan bila unduhan tidak dapat dibuat.
- Proyek Free dapat memiliki batas operasional/masa nonaktif; lakukan health check berkala dan simpan runbook reaktivasi.
- Hindari transform image berbayar; optimasi dilakukan sebelum upload atau melalui proses server yang anggarannya telah disetujui.

## Checklist rilis pilot

1. Migration diterapkan dari repository dan RLS test lulus.
2. Tidak ada service role atau token rahasia pada browser bundle.
3. Admin bootstrap dan satu Editor test terbukti memiliki akses tepat.
4. Konten draft tidak ditemukan oleh query/rute publik.
5. Consent foto dan public-download flag diuji pada UI dan API/ZIP.
6. Backup terenkripsi tercipta dan restore drill dicatat.
7. Lighthouse/aksesibilitas dasar serta mobile path utama diuji.
8. Error/log tidak mengandung PII/rahasia.

## Checklist sebelum produksi

Tambahan wajib: domain dikonfirmasi, custom domain/redirect/SEO diatur, sender email resmi diverifikasi, privacy notice disetujui, kebijakan Vercel dinilai, dan anggaran untuk layanan yang tidak lagi gratis disetujui pimpinan gereja.
