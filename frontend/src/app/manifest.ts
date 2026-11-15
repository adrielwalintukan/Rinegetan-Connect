import type { MetadataRoute } from "next";

// Colors come from tailwind.config.ts (navy.DEFAULT) so the install prompt, splash screen and
// browser chrome match the site instead of a guessed palette.
const NAVY = "#0A2540";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GMAHK Rinegetan",
    short_name: "GMAHK Rinegetan",
    description:
      "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Minahasa: jadwal ibadah, Sekolah Sabat, dan kegiatan jemaat.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: NAVY,
    background_color: NAVY,
    // `any` and `maskable` are separate entries on purpose: a single maskable entry would be
    // cropped on Android and a single any entry would show a rounded square inside a circle.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Only the public site is installable; the staff area is deliberately not part of the app.
    shortcuts: [
      { name: "Sekolah Sabat", short_name: "Sekolah Sabat", url: "/sekolah-sabat" },
      { name: "Jadwal & Kegiatan", short_name: "Kegiatan", url: "/kegiatan" },
      { name: "Kontak & Lokasi", short_name: "Kontak", url: "/kontak" },
    ],
  };
}
