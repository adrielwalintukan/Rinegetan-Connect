"use client";

import { useEffect } from "react";
import { getCourseLearning } from "@/lib/courses/progress";
import { useLearningProgress } from "./useLearningProgress";

export function LessonLearningActions({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { state, ready, persistent, update } = useLearningProgress();
  useEffect(() => { update(courseId, lessonId, "open"); }, [courseId, lessonId, update]);
  const progress = getCourseLearning(state, courseId, [{ id: lessonId }]);
  const completed = progress.completedIds.includes(lessonId);
  const bookmarked = progress.bookmarkedIds.includes(lessonId);
  return <section aria-label="Progres pelajaran" className="mt-10 border-t border-navy/10 pt-6">
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!ready} aria-pressed={completed} onClick={() => update(courseId, lessonId, "toggle-completed")} className="btn-primary min-h-11">{completed ? "Batalkan selesai" : "Tandai selesai"}</button>
      <button type="button" disabled={!ready} aria-pressed={bookmarked} onClick={() => update(courseId, lessonId, "toggle-bookmark")} className="btn-secondary min-h-11">{bookmarked ? "Batalkan bookmark" : "Simpan bookmark"}</button>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-slate-600">Membuka pelajaran tidak otomatis menandai selesai. Progres dan bookmark hanya pada browser/perangkat ini, dapat hilang jika data situs dibersihkan.</p>
    {!persistent && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Perubahan tidak tersimpan secara persisten. Penyimpanan browser tidak tersedia atau penuh; Anda tetap dapat membaca.</p>}
  </section>;
}
