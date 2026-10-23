import { createClient } from "@supabase/supabase-js";
import { UserFacingError } from "../api/errors.mjs";

export const PUBLIC_COURSES_TAG = "public-courses";
const courseColumns = "id,title,slug,summary,published_at,updated_at";
const lessonColumns = "id,course_id,title,slug,summary,position,published_at,updated_at";
const pageSize = 500;

export class PublicCourseQueryError extends UserFacingError {
  constructor() {
    super("Materi belum dapat dimuat. Silakan coba lagi.");
    this.name = "PublicCourseQueryError";
  }
}

/** Separate anonymous client: a staff session must never affect cached reader content.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function createPublicCourseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, (init?.method || "GET").toUpperCase() === "GET" ? {
          ...init, cache: "force-cache", next: { revalidate: 60, tags: [PUBLIC_COURSES_TAG] },
        } : init),
      },
    });
  } catch {
    return null;
  }
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} client */
function requireClient(client) {
  if (!client) throw new PublicCourseQueryError();
  return client;
}

/** @param {unknown} slug */
function validSlug(slug) {
  return typeof slug === "string" && slug.length <= 220 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Failed pages discard the entire collection instead of returning a partial success.
 * @template T
 * @param {(start: number, end: number) => PromiseLike<{ data: T[] | null, error: unknown }>} request
 * @returns {Promise<T[]>}
 */
async function readPages(request) {
  const rows = [];
  try {
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await request(start, start + pageSize - 1);
      if (error || !data) throw new PublicCourseQueryError();
      rows.push(...data);
      if (data.length < pageSize) return rows;
    }
  } catch {
    throw new PublicCourseQueryError();
  }
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} [client]
 * @returns {Promise<import('../../types/courses').PublicCourse[]>}
 */
export async function getPublicCourses(client = createPublicCourseClient()) {
  const db = requireClient(client);
  return readPages((start, end) => db.from("courses").select(courseColumns)
    .eq("status", "published").order("published_at", { ascending: false })
    .order("id", { ascending: true }).range(start, end));
}

/** @param {string} courseSlug
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [client]
 * @returns {Promise<import('../../types/courses').PublicCourse | null>}
 */
export async function getPublicCourse(courseSlug, client = createPublicCourseClient()) {
  if (!validSlug(courseSlug)) return null;
  try {
    const { data, error } = await requireClient(client).from("courses").select(courseColumns)
      .eq("status", "published").eq("slug", courseSlug).maybeSingle();
    if (error) throw new PublicCourseQueryError();
    return data;
  } catch {
    throw new PublicCourseQueryError();
  }
}

/** Parent Published access is enforced by RLS; routes load the public parent first.
 * @param {string} courseId
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [client]
 * @returns {Promise<import('../../types/courses').PublicLessonSummary[]>}
 */
export async function getPublicCourseLessons(courseId, client = createPublicCourseClient()) {
  const db = requireClient(client);
  return readPages((start, end) => db.from("course_lessons").select(lessonColumns)
    .eq("status", "published").eq("course_id", courseId).order("position", { ascending: true })
    .order("id", { ascending: true }).range(start, end));
}

/** @param {string} courseId
 * @param {string} lessonSlug
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [client]
 * @returns {Promise<import('../../types/courses').PublicLesson | null>}
 */
export async function getPublicLesson(courseId, lessonSlug, client = createPublicCourseClient()) {
  if (!validSlug(lessonSlug)) return null;
  try {
    const { data, error } = await requireClient(client).from("course_lessons").select(`${lessonColumns},body`)
      .eq("status", "published").eq("course_id", courseId).eq("slug", lessonSlug).maybeSingle();
    if (error) throw new PublicCourseQueryError();
    return data;
  } catch {
    throw new PublicCourseQueryError();
  }
}
