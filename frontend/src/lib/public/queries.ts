import type { Announcement, EventItem, Department } from "@/types/content";
import type { Schedule, ResolvedOccurrence } from "@/types/schedule";

export {
  getPublishedAnnouncements,
  getPublishedEvents,
  getPublishedSchedules,
  getPublishedDepartments,
  triggerPublicRevalidation,
} from "./queries.mjs";

export type PublicAnnouncementsResult = Announcement[];
export type PublicEventsResult = EventItem[];
export type PublicSchedulesResult = Schedule[] | ResolvedOccurrence[];
export type PublicDepartmentsResult = Department[];
