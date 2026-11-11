import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadSabbathCatalog } from "@/lib/sabbath/server";
import SabbathReader from "@/components/pages/SabbathReader";

export const metadata = { title: "Daftar Pelajaran Sekolah Sabat" };

export default async function Page({ params }: { params: Promise<{ quarterId: string }> }) {
  await connection();
  const { quarterId } = await params;
  if (!/^\d{4}-0[1-4]$/.test(quarterId)) notFound();
  const catalog = await loadSabbathCatalog();
  const entry = catalog.classes.find(item => item.classId === "adult" && item.quarterly.id === quarterId);
  if (catalog.status === "available" && !entry) notFound();
  return <SabbathReader quarterId={quarterId} snapshot={entry ? { ...entry, status: "available" } : { status: "unavailable" }} quarterly={entry?.quarterly} />;
}
