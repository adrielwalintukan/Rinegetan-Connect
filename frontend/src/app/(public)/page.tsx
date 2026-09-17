import HomePage from "@/components/pages/HomePage";
import { getPublishedAnnouncements, getPublishedEvents } from "@/lib/public/queries";

export const revalidate = 60;

export default async function Page() {
  const [announcements, events] = await Promise.all([
    getPublishedAnnouncements(),
    getPublishedEvents(),
  ]);

  return <HomePage announcements={announcements} events={events} />;
}
