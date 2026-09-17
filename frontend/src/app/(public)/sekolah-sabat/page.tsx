import SekolahSabatPage from "@/components/pages/SekolahSabatPage";
import { getPublishedSchedules } from "@/lib/public/queries";

export const revalidate = 60;

export default async function Page() {
  const schedules = await getPublishedSchedules();
  return <SekolahSabatPage initialSchedules={schedules} />;
}
