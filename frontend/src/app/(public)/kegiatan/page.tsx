import KegiatanPage from "@/components/pages/KegiatanPage";
import { getPublishedEvents } from "@/lib/public/queries";

export const revalidate = 60;

export default async function Page() {
  const events = await getPublishedEvents();
  return <KegiatanPage initialEvents={events} />;
}
