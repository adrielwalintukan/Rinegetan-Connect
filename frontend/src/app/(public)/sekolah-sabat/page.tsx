import type { Metadata } from "next";
import SekolahSabatPage from "@/components/pages/SekolahSabatPage";
import { getPublishedSchedules, getSiteSectionMedia } from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sekolah Sabat & Jadwal Ibadah WITA",
  description:
    "Jadwal Sekolah Sabat setiap Sabtu pukul 08.45 WITA, kelas anak hingga dewasa, dan jadwal kebaktian mingguan jemaat GMAHK Rinegetan.",
  openGraph: {
    title: "Sekolah Sabat & Jadwal Ibadah | GMAHK Rinegetan",
    description: "Pendalaman Alkitab dan jadwal ibadah mingguan GMAHK Rinegetan.",
  },
};

export default async function Page() {
  const [schedules, sectionMedia] = await Promise.all([
    getPublishedSchedules(),
    getSiteSectionMedia(),
  ]);
  return <SekolahSabatPage initialSchedules={schedules} sectionMedia={sectionMedia} />;
}

