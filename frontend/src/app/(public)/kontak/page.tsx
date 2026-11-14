import type { Metadata } from "next";
import KontakPage from "@/components/pages/KontakPage";

export const metadata: Metadata = {
  alternates: { canonical: "/kontak" },
  title: "Kontak & Lokasi Gereja",
  description:
    "Alamat lengkap, peta lokasi, nomor telepon, WhatsApp, dan formulir permohonan doa serta kunjungan pastoral GMAHK Rinegetan, Minahasa.",
  openGraph: {
    url: "/kontak",
    images: ["/opengraph-image"],
    title: "Kontak & Lokasi Gereja | GMAHK Rinegetan",
    description: "Hubungi dan kunjungi GMAHK Jemaat Rinegetan, Tondano, Minahasa.",
  },
};

export default function Page() {
  return <KontakPage />;
}
