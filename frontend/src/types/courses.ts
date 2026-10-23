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
