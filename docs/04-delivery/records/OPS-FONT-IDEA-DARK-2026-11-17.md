# OPS-FONT dan IDEA-DARK — Keputusan pemilik (2026-11-17)

**Status:** Kedua keputusan ditetapkan pemilik pada 2026-11-17. Tidak ada perubahan UI.

Issue: [OPS-FONT #70](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/70), [IDEA-DARK #71](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/71).

## Kenapa keputusan ini diperlukan

Kedua issue secara eksplisit menyebut hal yang belum ditetapkan dokumen, dan keduanya melarang implementer mengarangnya. OPS-FONT menunggu keputusan apakah fallback dipertahankan atau font resmi disediakan; IDEA-DARK menunggu keputusan apakah ide ditahan, ditolak, atau direncanakan.

## Keputusan OPS-FONT

**Fallback dipertahankan secara permanen.**

Stack `Plus Jakarta Sans, Noto Sans, system-ui, sans-serif` di `frontend/tailwind.config.ts` tetap dipakai dan sekarang dinyatakan sebagai keputusan desain, bukan keadaan sementara yang menunggu file Advent Sans.

Konsekuensi yang dicatat:

- Tidak ada klaim bahwa situs memakai Advent Sans resmi.
- Tidak ada pembelian lisensi, tidak ada pengunduhan font tanpa izin, dan tidak ada perubahan tipografi.
- Bila organisasi kelak menyediakan file berlisensi beserta hak penggunaan web yang terverifikasi, adopsinya menjadi pekerjaan baru dengan scope dan review tersendiri — termasuk pemeriksaan wrapping, regresi tipografi, dan aksesibilitas di lima viewport.

## Keputusan IDEA-DARK

**Ditahan sebagai ide, tidak dibangun.**

Dark Sabbath Mode tetap tercatat sebagai ide backlog di sistem desain, tetapi tidak ada komitmen implementasi. Tidak ada toggle tema, token warna gelap, atau penyimpanan preferensi tema.

Konsekuensi yang dicatat:

- Penutupan issue ini **tidak** berarti fiturnya ada. Ini dinyatakan eksplisit agar status tidak disalahartikan sebagai fitur yang sudah dibangun.
- Bila ide dibuka kembali, ia memerlukan kebutuhan pengguna, batas perubahan identitas Advent, serta pemeriksaan kontras dan fokus tersendiri.

## Perubahan dokumen

| Berkas | Perubahan |
| --- | --- |
| `docs/02-design/DESIGN-SYSTEM.md` | Tipografi: kalimat "sampai file Advent Sans berlisensi disediakan organisasi" diganti pernyataan keputusan permanen. Token visual: kalimat Dark Sabbath Mode diperluas menjadi "ditahan dan tidak dibangun" |
| `docs/04-delivery/ISSUE-BACKLOG.md` | Bagian "Keputusan pemilik 2026-11-17" memuat keempat keputusan beserta tanggalnya |

## Penjaga agar keputusan tidak hilang diam-diam

`frontend/tests/ops-font-idea-dark-decisions.test.mjs` (3 test) menjaga:

1. Sistem desain menyatakan fallback sebagai keputusan permanen dan tidak lagi memakai kalimat "menunggu organisasi".
2. Dark Sabbath Mode tetap disebut namanya, dinyatakan tidak dibangun, dan tidak ada kalimat yang menjanjikan implementasi.
3. Backlog memuat OPS-FONT, IDEA-DARK, dan tanggal 2026-11-17.

Mutasi yang dibuktikan menggigit:

| Mutasi | Hasil |
| --- | --- |
| "keputusan permanen" → "keadaan sementara" | test 1 gagal |
| "tidak dibangun" → "akan diimplementasikan" | test 2 gagal |

Setelah pemulihan: 3/3 lulus.

## Batas

- Tidak ada perubahan kode aplikasi, dependency, atau tampilan. Karena itu tidak ada test browser yang dijalankan untuk perubahan ini.
- Keputusan ini tidak menutup OPS-006 (#66), P4-005 (#54), atau issue backup (#62–#64); ketiganya bergantung pada bukti/izin dan keputusan terpisah.
