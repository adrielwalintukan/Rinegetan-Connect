import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathQuarter } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

export const metadata = { title: "Daftar Pelajaran Sekolah Sabat" };

export default async function Page({ params }: { params: Promise<{ quarterId: string }> }) {
  await connection();
  const { quarterId } = await params;
  if (!/^\d{4}-0[1-4]$/.test(quarterId)) notFound();
  const snapshot = await loadSabbathQuarter(quarterId);
  if (snapshot.status === "not-found") notFound();
  return <SabbathReader quarterId={quarterId} snapshot={snapshot} quarterly={snapshot.status === "available" ? snapshot.quarterly : null} />;
}
