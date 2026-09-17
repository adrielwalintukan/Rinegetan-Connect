export type ContentStatus = "draft" | "published" | "archived";

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  department_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  venue: string;
  department_id: string | null;
  cover_asset_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
