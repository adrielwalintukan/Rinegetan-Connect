import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathQuarter } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

const quarterIdPattern = /^\d{4}-0[1-4]$/;

export async function generateMetadata({ params }: { params: Promise<{ quarterId: string }> }): Promise<Metadata> {
  const { quarterId } = await params;
  // An id the reader could never serve is not a real page, so it must never become a canonical URL.
  if (!quarterIdPattern.test(quarterId)) return { title: "Daftar Pelajaran Sekolah Sabat", robots: { index: false, follow: false } };
  const path = `/sekolah-sabat/${quarterId}`;
  const base: Metadata = {
    title: "Daftar Pelajaran Sekolah Sabat",
    description: "Daftar pelajaran Sekolah Sabat Dewasa Bahasa Indonesia beserta sumber resminya.",
    alternates: { canonical: path },
    openGraph: { url: path, images: ["/opengraph-image"], title: "Daftar Pelajaran Sekolah Sabat | GMAHK Rinegetan" },
  };
  // The canonical link matters more than the title, so a source outage must not remove it.
  try {
    const snapshot = await loadSabbathQuarter(quarterId);
    const title = snapshot.status === "available" ? snapshot.quarterly?.title : undefined;
    if (!title) return base;
    return {
      ...base,
      title,
      openGraph: { ...base.openGraph, title: `${title} | GMAHK Rinegetan` },
    };
  } catch {
    return base;
  }
}

export default async function Page({ params }: { params: Promise<{ quarterId: string }> }) {
  await connection();
  const { quarterId } = await params;
  if (!quarterIdPattern.test(quarterId)) notFound();
  const snapshot = await loadSabbathQuarter(quarterId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} snapshot={snapshot} quarterly={snapshot.status === "available" ? snapshot.quarterly : null} />;
}
