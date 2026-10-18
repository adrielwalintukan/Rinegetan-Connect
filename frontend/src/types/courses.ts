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

export interface CourseContent {
  courses: Course[];
  lessons: CourseLesson[];
}
