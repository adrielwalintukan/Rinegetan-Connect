import { PUBLIC_COURSES_TAG } from "./public-queries.mjs";

/** @param {{ revalidateTag: (tag: string, profile: { expire: number }) => void, revalidatePath: (path: string, type?: 'page' | 'layout') => void }} hooks */
export function invalidateCourseReader({ revalidateTag, revalidatePath }) {
  revalidateTag(PUBLIC_COURSES_TAG, { expire: 0 });
  revalidatePath("/pelajari-alkitab");
  revalidatePath("/pelajari-alkitab/[courseSlug]", "page");
  revalidatePath("/pelajari-alkitab/[courseSlug]/[lessonSlug]", "page");
}
