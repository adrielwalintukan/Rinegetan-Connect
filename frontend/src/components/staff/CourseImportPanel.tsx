"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { clientErrorMessage } from "@/lib/api/errors";
import { CourseImportUploadDialog, CourseImportDecisionDialog } from "./CourseImportDialogs";
import type { CourseImport, CourseImportPayload } from "@/types/courses";

const button = "min-h-11 min-w-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";
const STATUS = { pending: ["Menunggu persetujuan", "bg-amber-50 text-amber-900"], approved: ["Disetujui", "bg-emerald-50 text-emerald-900"], rejected: ["Ditolak", "bg-red-50 text-red-800"] } as const;
const paragraphs = (text: string) => text.split(/\n[\t ]*\n/).filter(part => part.trim());

interface Props {
  imports: CourseImport[];
  role: "admin" | "editor";
  error?: string | null;
  onNotification: (type: "success" | "error", message: string) => void;
}

export function CourseImportPanel({ imports, role, error, onNotification }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [decision, setDecision] = useState<{ mode: "approve" | "reject"; item: CourseImport } | null>(null);
  const [previews, setPreviews] = useState<Record<string, CourseImportPayload | "loading" | "error">>({});
  const togglePreview = async (item: CourseImport) => {
    if (previews[item.id] && previews[item.id] !== "error") {
      setPreviews(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== item.id)));
      return;
    }
    setPreviews(prev => ({ ...prev, [item.id]: "loading" }));
    try {
      const res = await fetch(`/api/staff/course-imports/${item.id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Preview gagal dimuat.");
      setPreviews(prev => ({ ...prev, [item.id]: json.data as CourseImportPayload }));
    } catch (err) {
      setPreviews(prev => ({ ...prev, [item.id]: "error" }));
      onNotification("error", clientErrorMessage(err, "Preview gagal dimuat."));
    }
  };
  const decide = async (note?: string) => {
    if (!decision) return;
    const res = await fetch(`/api/staff/course-imports/${decision.item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision.mode === "approve" ? { action: "approve" } : { action: "reject", note }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Gagal menyimpan keputusan impor.");
    onNotification("success", decision.mode === "approve" ? "Lisensi disetujui. Course dibuat sebagai Draft." : "Impor ditolak.");
    setDecision(null); router.refresh();
  };
  return <section aria-labelledby="course-import-heading" className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="course-import-heading" className="text-lg font-bold text-navy">Impor course</h2>
      <button type="button" className={`${button} bg-navy text-white`} onClick={() => setUploading(true)}>Impor JSON</button>
    </div>
    <p className="text-sm text-slate-600">Impor menunggu persetujuan lisensi Admin. Setelah disetujui, course dan lesson dibuat sebagai Draft.</p>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {imports.length === 0 ? <p className="text-sm text-slate-600">Belum ada impor.</p> : <ul className="space-y-3">{imports.map(item => {
      const preview = previews[item.id];
      const [label, tone] = STATUS[item.status];
      return <li key={item.id} className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold text-navy">{item.course_title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span></div>
        <p className="break-all text-xs text-slate-500">{item.course_slug} · {item.lesson_count} lesson</p>
        <dl className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <div className="min-w-0"><dt className="font-semibold">Sumber</dt><dd className="break-words">{item.source_name}{item.source_url ? ` (${item.source_url})` : ""}</dd></div>
          <div className="min-w-0"><dt className="font-semibold">Pemegang hak</dt><dd className="break-words">{item.rights_holder}</dd></div>
          <div className="min-w-0"><dt className="font-semibold">Lisensi/izin</dt><dd className="break-words">{item.license_name}{item.license_url ? ` (${item.license_url})` : ""}</dd></div>
          {item.license_notes && <div className="min-w-0"><dt className="font-semibold">Catatan izin</dt><dd className="whitespace-pre-wrap break-words">{item.license_notes}</dd></div>}
        </dl>
        {item.status === "rejected" && item.review_note && <p className="whitespace-pre-wrap break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">Alasan penolakan: {item.review_note}</p>}
        {item.status === "approved" && item.created_by && item.created_by === item.reviewed_by && <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700">Diunggah dan disetujui oleh orang yang sama.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-expanded={Boolean(preview && preview !== "error")} className={button} disabled={preview === "loading"} onClick={() => void togglePreview(item)}>{preview && preview !== "error" && preview !== "loading" ? "Tutup preview" : "Lihat preview"}</button>
          {role === "admin" && item.status === "pending" && <>
            <button type="button" className={`${button} bg-navy text-white`} onClick={() => setDecision({ mode: "approve", item })}>Setujui</button>
            <button type="button" className={`${button} text-red-700`} onClick={() => setDecision({ mode: "reject", item })}>Tolak</button>
          </>}
        </div>
        {preview && preview !== "loading" && preview !== "error" && <div className="space-y-3 border-t border-slate-200 pt-3">
          {preview.course.summary && <p className="whitespace-pre-line break-words text-sm text-slate-600">{preview.course.summary}</p>}
          <ol className="space-y-3">{preview.lessons.map(lesson => <li key={lesson.slug} className="min-w-0">
            <h4 className="break-words font-semibold text-navy">{lesson.position}. {lesson.title}</h4>
            {lesson.summary && <p className="whitespace-pre-line break-words text-sm text-slate-600">{lesson.summary}</p>}
            <div className="mt-1 space-y-2 text-sm text-slate-800">{paragraphs(lesson.body).map((part, i) => <p key={i} className="whitespace-pre-line break-words">{part}</p>)}</div>
          </li>)}</ol>
        </div>}
      </li>;
    })}</ul>}
    {uploading && <CourseImportUploadDialog isOpen onClose={() => setUploading(false)} onUploaded={() => { setUploading(false); onNotification("success", "Berkas diunggah dan menunggu persetujuan lisensi."); router.refresh(); }} />}
    {decision && <CourseImportDecisionDialog key={`${decision.mode}-${decision.item.id}`} mode={decision.mode} isOpen title={decision.item.course_title} onClose={() => setDecision(null)} onConfirm={decide} />}
  </section>;
}
