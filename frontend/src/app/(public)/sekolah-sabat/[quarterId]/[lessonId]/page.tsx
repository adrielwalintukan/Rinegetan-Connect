import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathLesson } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

export const metadata = { title: "Hari Pelajaran Sekolah Sabat" };

export default async function Page({ params }: { params: Promise<{ quarterId: string; lessonId: string }> }) {
  await connection();
  const { quarterId, lessonId } = await params;
  const snapshot = await loadSabbathLesson(quarterId, lessonId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} lessonId={lessonId} snapshot={snapshot} />;
}
