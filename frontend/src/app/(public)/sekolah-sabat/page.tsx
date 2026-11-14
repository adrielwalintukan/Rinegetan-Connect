import type { Metadata } from "next";
import { connection } from "next/server";
import SekolahSabatPage from "@/components/pages/SekolahSabatPage";
import { getPublishedSchedules, getSiteSectionMedia } from "@/lib/public/queries";
import { loadSabbathCatalog } from "@/lib/sabbath/server";

export const metadata: Metadata = {
  alternates: { canonical: "/sekolah-sabat" },
  title: "Sekolah Sabat & Jadwal Ibadah WITA",
  description:
    "Jadwal Sekolah Sabat setiap Sabtu pukul 08.45 WITA, kelas anak hingga dewasa, dan jadwal kebaktian mingguan jemaat GMAHK Rinegetan.",
  openGraph: {
    url: "/sekolah-sabat",
    images: ["/opengraph-image"],
    title: "Sekolah Sabat & Jadwal Ibadah | GMAHK Rinegetan",
    description: "Pendalaman Alkitab dan jadwal ibadah mingguan GMAHK Rinegetan.",
  },
};

export default async function Page() {
  await connection(); // Evaluate the WITA date per request; retain the explicit catalog data cache.
  const [schedules, sectionMedia, catalog] = await Promise.all([
    getPublishedSchedules(),
    getSiteSectionMedia(),
    loadSabbathCatalog(),
  ]);
  return <SekolahSabatPage initialSchedules={schedules} sectionMedia={sectionMedia} catalog={catalog} />;
}

