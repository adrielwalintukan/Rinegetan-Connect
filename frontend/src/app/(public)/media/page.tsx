import type { Metadata } from "next";
import MediaPage from "@/components/pages/MediaPage";
import {
  getPublicMediaAlbums,
  getPublicMediaAssets,
} from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Media & Galeri Jemaat",
  description:
    "Dokumentasi foto kegiatan ibadah, pelayanan masyarakat, rekaman khotbah, dan warta multimedia GMAHK Jemaat Rinegetan.",
  openGraph: {
    title: "Media & Galeri Jemaat | GMAHK Rinegetan",
    description: "Galeri foto dan arsip multimedia kegiatan jemaat GMAHK Rinegetan.",
  },
};

export default async function Page() {
  const [albums, assets] = await Promise.all([
    getPublicMediaAlbums(),
    getPublicMediaAssets(),
  ]);

  return <MediaPage initialAlbums={albums} initialAssets={assets} />;
}
