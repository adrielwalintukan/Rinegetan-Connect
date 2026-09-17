import type { ContentStatus } from "./content";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleExceptionAction = "cancelled" | "override" | "added";

export interface Schedule {
  id: string;
  name: string;
  slug: string;
  day_of_week: DayOfWeek;
  start_time: string; // format HH:MM:SS atau HH:MM
  end_time: string | null;
  timezone: "Asia/Makassar";
  location: string;
  description: string | null;
  category: string;
  department_id?: string | null;
  status: ContentStatus;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleException {
  id: string;
  schedule_id: string | null;
  exception_date: string; // format YYYY-MM-DD
  action: ScheduleExceptionAction;
  custom_name?: string | null;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  custom_location?: string | null;
  reason?: string | null;
  status: ContentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedOccurrence {
  date: string; // format YYYY-MM-DD
  name: string;
  startTime: string; // format HH:MM
  endTime: string | null; // format HH:MM atau null
  location: string;
  category: string;
  scheduleId: string | null;
  isCancelled: boolean;
  isOverridden: boolean;
  isAdded: boolean;
  reason?: string | null;
}
