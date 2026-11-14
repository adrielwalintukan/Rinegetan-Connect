import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathDay } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

export const metadata = { title: "Bacaan Harian Sekolah Sabat" };

export default async function Page({ params }: { params: Promise<{ quarterId: string; lessonId: string; dayId: string }> }) {
  await connection();
  const { quarterId, lessonId, dayId } = await params;
  const snapshot = await loadSabbathDay(quarterId, lessonId, dayId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} lessonId={lessonId} snapshot={snapshot} />;
}
