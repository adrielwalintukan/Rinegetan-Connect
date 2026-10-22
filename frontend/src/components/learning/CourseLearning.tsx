"use client";

import Link from "next/link";
import type { PublicCourse, PublicLessonSummary } from "@/types/courses";
import { getCourseLearning } from "@/lib/courses/progress";
import { useLearningProgress } from "./useLearningProgress";

export function CourseLearning({ course, lessons }: { course: PublicCourse; lessons: PublicLessonSummary[] }) {
  const { state, ready, persistent } = useLearningProgress();
  const progress = getCourseLearning(state, course.id, lessons);
  const resume = ready && lessons.find(lesson => lesson.id === progress.continueLessonId);
  return <section aria-label="Daftar pelajaran" className="mt-8">
    <p className="text-sm text-slate-600">Progres dan bookmark hanya pada browser/perangkat ini, dapat hilang jika data situs dibersihkan.</p>
    {!persistent && <p role="status" className="mt-3 text-sm text-amber-800">Penyimpanan browser tidak tersedia. Perubahan tidak tersimpan secara persisten.</p>}
    {ready && <p className="mt-3 font-semibold text-navy" aria-live="polite">{progress.completedCount} dari {progress.total} pelajaran selesai</p>}
    {resume && <Link prefetch={false} href={`/pelajari-alkitab/${course.slug}/${resume.slug}`} className="btn-primary mt-4 min-h-11">{progress.lastLessonId ? "Lanjut belajar" : "Mulai belajar"}</Link>}
    {lessons.length === 0 ? <p className="mt-6 rounded-xl border border-navy/10 p-6">Belum ada pelajaran yang tersedia untuk course ini.</p> : <ol className="mt-6 space-y-3">
      {lessons.map(lesson => <li key={lesson.id} className="rounded-xl border border-navy/10 bg-white p-5">
        <Link prefetch={false} href={`/pelajari-alkitab/${course.slug}/${lesson.slug}`} className="inline-flex min-h-11 items-center break-words text-lg font-semibold text-navy underline decoration-sabbath-500 underline-offset-4">{lesson.position}. {lesson.title}</Link>
        {lesson.summary && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{lesson.summary}</p>}
        {ready && <p className="mt-2 text-sm font-medium text-navy">{progress.completedIds.includes(lesson.id) && <span className="mr-4">Selesai</span>}{progress.bookmarkedIds.includes(lesson.id) && <span>Bookmark tersimpan</span>}</p>}
      </li>)}
    </ol>}
  </section>;
}
