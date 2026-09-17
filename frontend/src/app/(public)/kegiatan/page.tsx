import type { Metadata } from "next";
import KegiatanPage from "@/components/pages/KegiatanPage";
import { getPublishedEvents } from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Agenda & Kegiatan Jemaat",
  description:
    "Jadwal kegiatan jemaat GMAHK Rinegetan: ibadah Sabat, perkumpulan pemuda, pelayanan masyarakat, dan kelompok pendalaman Alkitab.",
  openGraph: {
    title: "Agenda & Kegiatan Jemaat | GMAHK Rinegetan",
    description: "Temukan jadwal kegiatan dan persekutuan rohani di GMAHK Rinegetan.",
  },
};

export default async function Page() {
  const events = await getPublishedEvents();
  return <KegiatanPage initialEvents={events} />;
}
