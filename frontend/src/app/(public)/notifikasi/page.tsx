import type { Metadata } from "next";
import { NotificationCentre } from "@/components/notifications/NotificationCentre";
import { GridGuides } from "@/components/layout/CreationGrid";

export const metadata: Metadata = {
  alternates: { canonical: "/notifikasi" },
  title: "Preferensi Notifikasi",
  description:
    "Pilih kabar jemaat yang ingin Anda terima lewat notifikasi. Tanpa akun, tanpa email, dan tanpa nomor telepon.",
  robots: { index: false, follow: true },
  openGraph: {
    url: "/notifikasi",
    images: ["/opengraph-image"],
    title: "Preferensi Notifikasi | GMAHK Rinegetan",
    description: "Atur kategori notifikasi jemaat GMAHK Rinegetan untuk perangkat Anda.",
  },
};

export default function Page() {
  return (
    <section className="relative py-12 lg:py-20" aria-labelledby="notifikasi-title">
      <GridGuides />
      <div className="container-site relative">
        <NotificationCentre />
      </div>
    </section>
  );
}
