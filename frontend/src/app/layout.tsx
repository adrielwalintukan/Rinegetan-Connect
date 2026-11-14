import type { Metadata } from "next";
import { CHURCH } from "@/data/content";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gmahkrinegetan.web.id";

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
    images: ["/opengraph-image"],
    title: "GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    description:
      "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan. Temukan jadwal ibadah Sabat, Sekolah Sabat, dan kegiatan jemaat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GMAHK Rinegetan",
    description: "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Minahasa.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Structured data for the church itself, rendered on every page so Google can
// link the site to the congregation, its pin, and its weekly service times.
// Only verified values from content.js are used: no phone, email, street number,
// or closing time is invented.
const [latitude, longitude] = String(CHURCH.mapsQuery)
  .split(",")
  .map((value) => Number(value.trim()));

const geoCoordinates =
  Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { "@type": "GeoCoordinates", latitude, longitude }
    : undefined;

const sameAs = CHURCH.socials.map((s) => s.href);

const churchStructuredData = {
  "@type": "Church",
  "@id": `${siteUrl}/#gereja`,
  name: `${CHURCH.fullName} Jemaat Rinegetan`,
  alternateName: [CHURCH.name, "Gereja Advent Rinegetan", "GMAHK Tondano"],
  description:
    "Website resmi Gereja Masehi Advent Hari Ketujuh Jemaat Rinegetan, Tondano, Kabupaten Minahasa, Sulawesi Utara. Jadwal Sekolah Sabat, ibadah Sabat, dan kegiatan jemaat.",
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
  image: `${siteUrl}/opengraph-image`,
  ...(sameAs.length > 0 ? { sameAs } : {}),
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rinegetan",
    addressLocality: "Tondano",
    addressRegion: "Sulawesi Utara",
    addressCountry: "ID",
  },
  geo: geoCoordinates,
  hasMap: "https://maps.app.goo.gl/dUfu9roHcnH5pfdn8",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Saturday",
      opens: "08:45",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Saturday",
      opens: "10:15",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Wednesday",
      opens: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Friday",
      opens: "18:30",
    },
  ],
};

const webSiteStructuredData = {
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: CHURCH.name,
  alternateName: ["Gereja Advent Rinegetan", `${CHURCH.fullName} Jemaat Rinegetan`],
  publisher: {
    "@id": `${siteUrl}/#gereja`,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [webSiteStructuredData, churchStructuredData],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <script
          type="application/ld+json"
          // Static data only; escaping "<" keeps the payload safe inside HTML.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
