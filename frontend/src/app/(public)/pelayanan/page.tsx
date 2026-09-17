import PelayananPage from "@/components/pages/PelayananPage";
import { getPublishedDepartments } from "@/lib/public/queries";

export const revalidate = 60;

export default async function Page() {
  const departments = await getPublishedDepartments();
  return <PelayananPage initialDepartments={departments} />;
}
