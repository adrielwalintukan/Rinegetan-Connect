import type { Metadata } from "next";
import HomePage from "@/components/pages/HomePage";
import {
  getPublishedAnnouncements,
  getPublishedEvents,
  getSiteSectionMedia,
} from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Selamat datang di GMAHK Jemaat Rinegetan, Minahasa. Tempat bertumbuh dalam iman, melayani, dan bersekutu dalam kasih Kristus.",
  openGraph: {
    title: "GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    description: "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Minahasa.",
  },
};

export default async function Page() {
  const [announcements, events, sectionMedia] = await Promise.all([
    getPublishedAnnouncements(),
    getPublishedEvents(),
    getSiteSectionMedia(),
  ]);

  return (
    <HomePage
      announcements={announcements}
      events={events}
      sectionMedia={sectionMedia}
    />
  );
}

