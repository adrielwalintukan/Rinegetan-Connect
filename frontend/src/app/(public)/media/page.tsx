import type { Metadata } from "next";
import MediaPage from "@/components/pages/MediaPage";

export const metadata: Metadata = {
  title: "Media & Galeri Jemaat",
  description:
    "Dokumentasi foto kegiatan ibadah, pelayanan masyarakat, rekaman khotbah, dan warta multimedia GMAHK Jemaat Rinegetan.",
  openGraph: {
    title: "Media & Galeri Jemaat | GMAHK Rinegetan",
    description: "Galeri foto dan arsip multimedia kegiatan jemaat GMAHK Rinegetan.",
  },
};

export default function Page() {
  return <MediaPage />;
}
