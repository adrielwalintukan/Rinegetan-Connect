import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathDay } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

type Props = { params: Promise<{ quarterId: string; lessonId: string; dayId: string }> };

const quarterIdPattern = /^\d{4}-0[1-4]$/;
const idPattern = /^\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quarterId, lessonId, dayId } = await params;
  // Ids the reader cannot serve are not real pages, so they must never become a canonical URL.
  if (!quarterIdPattern.test(quarterId) || !idPattern.test(lessonId) || !idPattern.test(dayId)) {
    return { title: "Bacaan Harian Sekolah Sabat", robots: { index: false, follow: false } };
  }
  const path = `/sekolah-sabat/${quarterId}/${lessonId}/${dayId}`;
  const base: Metadata = {
    title: "Bacaan Harian Sekolah Sabat",
    description: "Bacaan harian Sekolah Sabat Dewasa Bahasa Indonesia dengan ayat dan sumber resminya.",
    alternates: { canonical: path },
    openGraph: { url: path, images: ["/opengraph-image"], title: "Bacaan Harian Sekolah Sabat | GMAHK Rinegetan" },
  };
  // The canonical link matters more than the title, so a source outage must not remove it.
  try {
    const snapshot = await loadSabbathDay(quarterId, lessonId, dayId);
    const title = snapshot.status === "available" ? snapshot.data?.title : undefined;
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

export default async function Page({ params }: Props) {
  await connection();
  const { quarterId, lessonId, dayId } = await params;
  const snapshot = await loadSabbathDay(quarterId, lessonId, dayId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} lessonId={lessonId} snapshot={snapshot} />;
}
