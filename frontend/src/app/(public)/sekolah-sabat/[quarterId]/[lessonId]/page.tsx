import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathLesson } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

type Props = { params: Promise<{ quarterId: string; lessonId: string }> };

const quarterIdPattern = /^\d{4}-0[1-4]$/;
const lessonIdPattern = /^\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quarterId, lessonId } = await params;
  // Ids the reader cannot serve are not real pages, so they must never become a canonical URL.
  if (!quarterIdPattern.test(quarterId) || !lessonIdPattern.test(lessonId)) {
    return { title: "Hari Pelajaran Sekolah Sabat", robots: { index: false, follow: false } };
  }
  const path = `/sekolah-sabat/${quarterId}/${lessonId}`;
  const base: Metadata = {
    title: "Hari Pelajaran Sekolah Sabat",
    description: "Daftar hari bacaan pelajaran Sekolah Sabat Dewasa Bahasa Indonesia.",
    alternates: { canonical: path },
    openGraph: { url: path, images: ["/opengraph-image"], title: "Hari Pelajaran Sekolah Sabat | GMAHK Rinegetan" },
  };
  // The canonical link matters more than the title, so a source outage must not remove it.
  try {
    const snapshot = await loadSabbathLesson(quarterId, lessonId);
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
  const { quarterId, lessonId } = await params;
  const snapshot = await loadSabbathLesson(quarterId, lessonId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} lessonId={lessonId} snapshot={snapshot} />;
}
