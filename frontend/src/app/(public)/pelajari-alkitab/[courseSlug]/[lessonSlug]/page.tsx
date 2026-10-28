import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { GridGuides } from "@/components/layout/CreationGrid";
import { LessonLearningActions } from "@/components/learning/LessonLearningActions";
import { getPublicCourse, getPublicCourseLessons, getPublicLesson } from "@/lib/courses/public-queries";

type Props = { params: Promise<{ courseSlug: string; lessonSlug: string }> };
async function publicLesson(params: Props["params"]) {
  await connection();
  const { courseSlug, lessonSlug } = await params;
  const course = await getPublicCourse(courseSlug);
  if (!course) notFound();
  const lesson = await getPublicLesson(course.id, lessonSlug);
  if (!lesson || lesson.course_id !== course.id) notFound();
  return { course, lesson };
}

export async function generateMetadata({ params }: Props) {
  const { lesson } = await publicLesson(params);
  return { title: lesson.title, description: lesson.summary };
}

export default async function BibleLesson({ params }: Props) {
  const { course, lesson } = await publicLesson(params);
  const lessons = await getPublicCourseLessons(course.id);
  const index = lessons.findIndex(row => row.id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 ? lessons[index + 1] : null;
  const courseUrl = `/pelajari-alkitab/${course.slug}`;
  return <section className="relative py-10 lg:py-16">
    <GridGuides />
    <div className="container-site relative grid lg:grid-cols-7">
      <article className="min-w-0 max-w-3xl break-words lg:col-span-6 [overflow-wrap:anywhere]">
        <nav aria-label="Jejak halaman" className="flex flex-wrap gap-x-4 text-sm font-semibold text-navy">
          <Link prefetch={false} href="/pelajari-alkitab" className="inline-flex min-h-11 items-center underline underline-offset-4">Pelajari Alkitab</Link>
          <Link prefetch={false} href={courseUrl} className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-4">{course.title}</Link>
        </nav>
        <p className="label-eyebrow mt-6">Pelajaran {lesson.position}</p>
        <h1 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-slate-600">{lesson.summary}</p>}
        <div data-testid="lesson-body" className="mt-8 space-y-6 text-base leading-8 text-navy sm:text-lg">
          {lesson.body.replace(/\r\n?/g, "\n").split(/\n[\t ]*\n/).filter(paragraph => paragraph.trim()).map((paragraph, i) => <p key={i} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
        <LessonLearningActions courseId={course.id} lessonId={lesson.id} />
        <nav aria-label="Navigasi pelajaran" className="mt-8 flex flex-wrap gap-4 border-t border-navy/10 pt-6">
          {previous && <Link prefetch={false} href={`${courseUrl}/${previous.slug}`} className="btn-secondary min-h-11">Sebelumnya: {previous.title}</Link>}
          {next && <Link prefetch={false} href={`${courseUrl}/${next.slug}`} className="btn-primary min-h-11">Berikutnya: {next.title}</Link>}
          <Link prefetch={false} href={courseUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-4">Kembali ke course</Link>
          <Link prefetch={false} href="/pelajari-alkitab#ingin-belajar" className="inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-4">Ingin belajar bersama?</Link>
        </nav>
      </article>
    </div>
  </section>;
}
