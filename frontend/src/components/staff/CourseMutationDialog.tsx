"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";
import { clientErrorMessage } from "@/lib/api/errors";
import type { Course, CourseLesson } from "@/types/courses";
import type { CourseForm, LessonForm } from "@/lib/courses/mutations";

interface Props {
  kind: "course" | "lesson";
  courseId?: string;
  courseTitle?: string;
  initialData?: Course | CourseLesson;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: CourseForm | LessonForm) => Promise<void>;
}
const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-slate-100";
const button = "min-h-11 min-w-11 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";

export function CourseMutationDialog({ kind, courseId, courseTitle, initialData, isOpen, isSaving, onClose, onSave }: Props) {
  const [form, setForm] = useState(() => ({ title: initialData?.title ?? "", slug: initialData?.slug ?? "", summary: initialData?.summary ?? "", body: initialData && "body" in initialData ? initialData.body : "", position: initialData && "position" in initialData ? String(initialData.position) : "1" }));
  const [initial] = useState(() => JSON.stringify(form));
  const saving = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const continueEditing = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  useEffect(() => { if (discard) continueEditing.current?.focus(); }, [discard]);
  useEffect(() => { if (isSaving) panel.current?.focus(); }, [isSaving]);
  const dirty = JSON.stringify(form) !== initial;
  const requestClose = () => { if (isSaving || saving.current) return; if (dirty) setDiscard(true); else onClose(); };
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);
  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [event.target.name]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || saving.current) return;
    saving.current = true; setError(null);
    try {
      const data: CourseForm = { title: form.title, slug: form.slug, summary: form.summary };
      await onSave(kind === "lesson" ? { ...data, body: form.body, position: Number(form.position), ...(!initialData ? { course_id: courseId } : {}) } : data);
    } catch (err) { setError(clientErrorMessage(err, "Gagal menyimpan materi. Silakan coba lagi.")); }
    finally { saving.current = false; }
  };
  return <Modal isOpen={isOpen} onClose={requestClose} className={MODAL_BACKDROP} labelledBy="course-form-title">
    <div ref={panel} tabIndex={-1} className="relative w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl sm:p-6" onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="flex items-start justify-between gap-3"><h2 id="course-form-title" className="text-lg font-bold text-navy">{initialData ? "Edit" : "Tambah"} {kind === "course" ? "Course" : "Lesson"}</h2><button type="button" aria-label="Tutup form" className={button} disabled={isSaving} onClick={requestClose}>✕</button></div>
      {kind === "lesson" && <p className="mt-2 break-words text-sm text-slate-600">Course induk: {courseTitle ?? courseId}</p>}
      {initialData?.status === "published" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Perubahan langsung berlaku pada materi Published jika course induknya Published. Gunakan Jadikan Draft untuk menyembunyikan materi selama revisi.</p>}
      {!initialData && <p className="mt-2 text-sm text-slate-600">Materi baru disimpan sebagai Draft. Terbitkan setelah tersimpan.</p>}
      {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Judul<input name="title" value={form.title} onChange={change} required maxLength={200} className={field} disabled={isSaving} /></label>
        <label className="block text-sm font-semibold text-slate-700">Slug<input name="slug" value={form.slug} onChange={change} required maxLength={220} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Gunakan huruf kecil, angka, dan tanda hubung" disabled={isSaving || Boolean(initialData?.published_at)} className={field} /></label>
        {initialData?.published_at && <p className="text-xs text-slate-600">Slug terkunci setelah publikasi pertama.</p>}
        <label className="block text-sm font-semibold text-slate-700">Ringkasan<textarea name="summary" value={form.summary} onChange={change} rows={3} maxLength={500} className={field} disabled={isSaving} /></label>
        {kind === "lesson" && <>
          <label className="block text-sm font-semibold text-slate-700">Nomor urut<input name="position" type="number" min={1} step={1} required value={form.position} onChange={change} className={field} disabled={isSaving} /></label>
          <p className="text-xs text-slate-600">Nomor urut harus unik dalam course dan boleh bercelah. Nomor yang sudah digunakan akan ditolak.</p>
          <label className="block text-sm font-semibold text-slate-700">Isi lesson<textarea name="body" value={form.body} onChange={change} maxLength={50000} rows={9} className={field} disabled={isSaving} /></label>
          <p className="text-xs text-slate-600">Teks berparagraf, maksimal 50.000 karakter. HTML dan Markdown ditampilkan sebagai teks.</p>
        </>}
        {discard ? <div role="alert" className="rounded-xl bg-amber-50 p-3"><p className="text-sm text-amber-900">Buang perubahan yang belum disimpan?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" ref={continueEditing} onClick={() => { setDiscard(false); panel.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus(); }} className={`${button} border border-slate-300`}>Lanjutkan edit</button><button type="button" onClick={onClose} className={`${button} bg-red-600 text-white`}>Buang perubahan</button></div></div> : <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={isSaving} onClick={requestClose} className={`${button} border border-slate-300`}>Batal</button><button type="submit" disabled={isSaving} className={`${button} bg-navy text-white`}>{isSaving ? "Menyimpan..." : "Simpan materi"}</button></div>}
      </form>
    </div>
  </Modal>;
}
