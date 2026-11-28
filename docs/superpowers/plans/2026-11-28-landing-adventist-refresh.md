# Landing page ala adventist.org — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** header transparan + dropdown, hero foto full-bleed, kartu aksi foto di atas latar gelombang.
**Architecture:** ubah di tempat tiga komponen (`GlobalNav`, `Hero`, `DigitalMinistrySection`) dan data `NAV_GROUPS`/`MINISTRY_CARDS`; tanpa dependensi baru.
**Tech Stack:** Next.js 16, Tailwind, framer-motion, lucide-react, node:test.
**Spec:** `docs/superpowers/specs/2026-11-28-landing-adventist-refresh-design.md`

## Global Constraints
- Warna hanya token navy/sabbath; pil aksi `btn-sabbath`. Tanpa SEARCH. Logo tidak diubah.
- Semua `data-testid` dan href yang diuji tetap: `nav-cta-pelajari-alkitab`, `hero-cta-sekolah-sabat`,
  `hero-cta-jadwal-ibadah`, `hero-image-frame` (berisi `<img>`), `mobile-menu(-button)`,
  `digital-ministry-section`, `ministry-card-*`, link `/kontak#permohonan-doa`, `/kontak#berkunjung`, `/pelajari-alkitab`.
- Teks hero "Jumat matahari terbenam sampai Sabtu matahari terbenam" tetap; `motion-reduce:![transform:none]` tetap pada img hero.
- Satu `h1`, tanpa overflow horizontal di 375px, fokus terlihat, kontras AA.

## Review Focus
- Header transparan hanya di `/` sebelum scroll; halaman lain selalu solid (jangan teks putih di atas latar putih).
- Dropdown bisa dibuka dengan keyboard (Enter/Space), tutup dengan Escape dan klik di luar.
- Menu overlay mobile tetap bekerja; MENU desktop membuka overlay yang sama.
- `DigitalMinistrySection` juga dipakai `/pelayanan` — kartu harus tampil baik di sana.
- Reduced motion: tidak ada parallax/fade di hero.

### Task 1: Header (`src/components/layout/GlobalNav.jsx`, `src/data/content.js`)
- [ ] Test di `tests/landing-adventist.test.mjs`: render `GlobalNav` → ada `data-testid="nav-group-*"` untuk tiga grup, `aria-expanded="false"`, tidak ada teks "SEARCH"/"Cari".
- [ ] `NAV_GROUPS = [{label, id, links:[NAV_LINKS item]}]` di content.js (Tentang, Ibadah & Belajar, Kegiatan & Media).
- [ ] Header: `fixed` + transparan di `/` saat `scrollY < 24` dan menu tertutup; selain itu `sticky bg-navy`. Baris utilitas `xl` saja.
- [ ] Commit `feat(landing): header transparan dengan dropdown`.

### Task 2: Hero (`src/components/sections/Hero.jsx`)
- [ ] Test: render `Hero` → `data-testid="hero-image-frame"` membungkus img; h1 ada; testid CTA tetap.
- [ ] Section `min-h-[100svh]`, img absolute full-bleed, gradasi navy, teks putih, garis Sabat amber kanan.
- [ ] Commit `feat(landing): hero foto full-bleed`.

### Task 3: Kartu foto (`src/components/sections/DigitalMinistrySection.jsx`, `MINISTRY_CARDS`)
- [ ] Test: tiga `ministry-card-*` urut berkunjung, doa, alkitab; tiap kartu punya `<img alt>`; ada `<svg` gelombang.
- [ ] `MINISTRY_CARDS[i].image` dari `IMAGES`; judul "Kunjungi Gereja". Section navy, gelombang SVG atas/bawah, kartu `aspect-[4/5]`, overlay, tombol `btn-sabbath`.
- [ ] Commit `feat(landing): kartu aksi foto di atas latar gelombang`.

### Task 4: Verifikasi
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` lulus.
- [ ] Browser lokal 1440 dan 375: `/`, `/pelayanan`, `/kontak`; tangkapan layar; PR `--squash` ke `development`.
