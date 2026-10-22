import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { GridGuides } from "@/components/layout/CreationGrid";
import { CourseLearning } from "@/components/learning/CourseLearning";
import { getPublicCourse, getPublicCourseLessons } from "@/lib/courses/public-queries";

type Props = { params: Promise<{ courseSlug: string }> };

export async function generateMetadata({ params }: Props) {
  await connection();
  const { courseSlug } = await params;
  const course = await getPublicCourse(courseSlug);
  if (!course) notFound();
  return { title: course.title, description: course.summary };
}

export default async function BibleCourse({ params }: Props) {
  await connection();
  const { courseSlug } = await params;
  const course = await getPublicCourse(courseSlug);
  if (!course) notFound();
  const lessons = await getPublicCourseLessons(course.id);
  return <section className="relative py-12 lg:py-20">
    <GridGuides />
    <div className="container-site relative grid lg:grid-cols-7">
      <div className="min-w-0 max-w-3xl break-words lg:col-span-6 [overflow-wrap:anywhere]">
        <nav aria-label="Jejak halaman"><Link prefetch={false} href="/pelajari-alkitab" className="inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-4">Pelajari Alkitab</Link></nav>
        <h1 className="mt-4 text-3xl font-bold text-navy sm:text-4xl">{course.title}</h1>
        {course.summary && <p className="mt-5 whitespace-pre-line leading-relaxed text-slate-600">{course.summary}</p>}
        <CourseLearning course={course} lessons={lessons} />
      </div>
    </div>
  </section>;
}
