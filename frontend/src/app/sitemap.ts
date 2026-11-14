import type { MetadataRoute } from "next";
import { getPublicCourses, getPublicCourseLessons } from "@/lib/courses/public-queries";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://gmahkrinegetan.web.id").replace(/\/$/, "");

const publicRoutes = [
  "/",
  "/tentang-kami",
  "/sekolah-sabat",
  "/kegiatan",
  "/pelayanan",
  "/media",
  "/kontak",
  "/pelajari-alkitab",
];

function toLastModified(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
  }));

  try {
    const courses = await getPublicCourses();

    for (const course of courses) {
      const courseUrl = `${siteUrl}/pelajari-alkitab/${course.slug}`;
      entries.push({
        url: courseUrl,
        lastModified: toLastModified(course.updated_at) ?? toLastModified(course.published_at),
      });

      try {
        const lessons = await getPublicCourseLessons(course.id);
        for (const lesson of lessons) {
          entries.push({
            url: `${courseUrl}/${lesson.slug}`,
            lastModified: toLastModified(lesson.updated_at) ?? toLastModified(lesson.published_at),
          });
        }
      } catch {
        // Keep the rest of the sitemap available if one course's lessons cannot be read.
      }
    }
  } catch {
    // Static public routes remain available if the course database is temporarily unavailable.
  }

  return entries;
}
