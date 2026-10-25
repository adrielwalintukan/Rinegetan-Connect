import type { ContentStatus } from "./content";

export interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CourseLesson extends Course {
  course_id: string;
  body: string;
  position: number;
}

export type PublicCourse = Pick<Course, "id" | "title" | "slug" | "summary" | "published_at" | "updated_at">;

export type PublicLessonSummary = Pick<CourseLesson,
  "id" | "course_id" | "title" | "slug" | "summary" | "position" | "published_at" | "updated_at"
>;

export type PublicLesson = PublicLessonSummary & { body: string };

export interface CourseContent {
  courses: Course[];
  lessons: CourseLesson[];
}

export interface CourseImportPayload {
  format: "rinegetan-course-import/1";
  language: "id";
  source: { name: string; url: string | null; rights_holder: string };
  license: { name: string; url: string | null; notes: string };
  course: { title: string; slug: string; summary: string };
  lessons: { position: number; title: string; slug: string; summary: string; body: string }[];
}

export interface CourseImport {
  id: string;
  status: "pending" | "approved" | "rejected";
  course_title: string;
  course_slug: string;
  lesson_count: number;
  source_name: string;
  source_url: string | null;
  rights_holder: string;
  license_name: string;
  license_url: string | null;
  license_notes: string | null;
  created_by: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  course_id: string | null;
}
