import type { Metadata } from "next";
import TentangKamiPage from "@/components/pages/TentangKamiPage";
import { getSiteSectionMedia } from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tentang Kami — Sejarah & Visi Jemaat",
  description:
    "Sejarah berdirinya GMAHK Jemaat Rinegetan di Tondano, Minahasa, visi misi persekutuan, doktrin Alkitabiah, dan kepemimpinan gereja.",
  openGraph: {
    title: "Tentang Kami | GMAHK Rinegetan",
    description: "Mengenal lebih dekat perjalanan iman dan komunitas GMAHK Jemaat Rinegetan.",
  },
};

export default async function Page() {
  const sectionMedia = await getSiteSectionMedia();
  return <TentangKamiPage sectionMedia={sectionMedia} />;
}

