import type { Metadata } from "next";
import PelayananPage from "@/components/pages/PelayananPage";
import { getPublishedDepartments } from "@/lib/public/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Departemen & Pelayanan Jemaat",
  description:
    "Sembilan departemen pelayanan GMAHK Rinegetan: Diakon, Pelayanan Pemuda, Komunikasi, Pelayanan Pribadi, dan Pelayanan Anak.",
  openGraph: {
    title: "Departemen & Pelayanan Jemaat | GMAHK Rinegetan",
    description: "Informasi bidang pelayanan dan keterlibatan jemaat di GMAHK Rinegetan.",
  },
};

export default async function Page() {
  const departments = await getPublishedDepartments();
  return <PelayananPage initialDepartments={departments} />;
}
