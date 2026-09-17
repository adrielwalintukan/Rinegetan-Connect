import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rinegetan-connect.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    template: "%s | GMAHK Rinegetan",
  },
  description:
    "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Minahasa, Sulawesi Utara. Informasi jadwal ibadah Sabat, Sekolah Sabat, kegiatan jemaat, dan pelayanan rohani.",
  keywords: [
    "GMAHK Rinegetan",
    "Gereja Advent Rinegetan",
    "Advent Minahasa",
    "GMAHK Tondano",
    "Sekolah Sabat",
    "Ibadah Sabat",
    "Advent Sulawesi Utara",
  ],
  authors: [{ name: "GMAHK Jemaat Rinegetan" }],
  creator: "GMAHK Jemaat Rinegetan",
  publisher: "GMAHK Jemaat Rinegetan",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "GMAHK Rinegetan",
    title: "GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    description:
      "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan. Temukan jadwal ibadah Sabat, Sekolah Sabat, dan kegiatan jemaat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GMAHK Rinegetan",
    description: "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Minahasa.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
