"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContentFilterBar } from "./ContentFilterBar";
import { ContentStatusBadge } from "./ContentStatusBadge";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { CourseMutationDialog } from "./CourseMutationDialog";
import { CourseImportPanel } from "./CourseImportPanel";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { clientErrorMessage } from "@/lib/api/errors";
import type { Course, CourseImport, CourseLesson } from "@/types/courses";
import type { CourseForm, LessonForm, CourseMutation } from "@/lib/courses/mutations";

interface Props {
  courses: Course[];
  lessons: CourseLesson[];
  role: "admin" | "editor";
  onNotification: (type: "success" | "error", message: string) => void;
  error?: string | null;
  imports?: CourseImport[];
  importsError?: string | null;
}
const button = "min-h-11 min-w-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";
const readerRefreshWarning = "Perubahan tersimpan, tetapi penyegaran tampilan publik belum berhasil. Silakan periksa kembali beberapa saat lagi.";

export function CourseManager({ courses, lessons, role, onNotification, error, imports, importsError }: Props) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ kind: "course" | "lesson"; item?: Course | CourseLesson } | null>(null);
  const [deleting, setDeleting] = useState<Course | CourseLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [readerRefreshPending, setReaderRefreshPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = saving || refreshing;
  const pending = useRef(false);
  const selected = courses.find(item => item.id === selectedCourseId);
  const items = selected ? lessons.filter(item => item.course_id === selected.id).sort((a, b) => a.position - b.position) : courses;
  const filtered = items.filter(item => (filter === "all" || item.status === filter) && `${item.title} ${item.slug}`.toLowerCase().includes(search.trim().toLowerCase()));
  const counts = { all: items.length, draft: items.filter(i => i.status === "draft").length, published: items.filter(i => i.status === "published").length, archived: items.filter(i => i.status === "archived").length };
  const entity = selected ? "course_lessons" : "courses";
  const mutate = async (command: CourseMutation) => {
    if (pending.current) throw new Error("Tunggu hingga penyimpanan selesai.");
    pending.current = true; setSaving(true);
    try {
      const res = await fetch("/api/staff/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success !== true || !json.data) throw new Error(typeof json.error === "string" ? json.error : "Gagal memperbarui materi. Silakan coba lagi.");
      setReaderRefreshPending(json.warning === readerRefreshWarning);
      startRefresh(() => router.refresh()); onNotification("success", "Materi berhasil diperbarui.");
    } catch (err) { onNotification("error", clientErrorMessage(err, "Gagal memperbarui materi.")); throw err; }
    finally { pending.current = false; setSaving(false); }
  };
  const save = async (data: CourseForm | LessonForm) => {
    if (!dialog) return;
    await mutate({ entity: dialog.kind === "course" ? "courses" : "course_lessons", action: "save", ...(dialog.item ? { id: dialog.item.id } : {}), data });
    setDialog(null);
  };
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button className={`${button} mt-3`} onClick={() => router.refresh()}>Coba muat ulang</button></div>;
  return <section aria-label="Pengelola Course dan Lesson" className="min-w-0 space-y-4">
    {readerRefreshPending && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{readerRefreshWarning}</p>}
    {selectedCourseId && !selected && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">Course tidak lagi tersedia. Daftar course telah diperbarui.</p>}
    {selected && <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><button type="button" onClick={() => { setSelectedCourseId(null); setFilter("all"); setSearch(""); }} className={button}>Kembali ke daftar course</button><h2 className="break-words text-xl font-bold text-navy">{selected.title}</h2><ContentStatusBadge status={selected.status} /><p className="break-words text-sm text-slate-600">{selected.summary}</p>{selected.status !== "published" && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Course induk belum Published. Lesson tidak terbaca publik, termasuk lesson yang sudah Published.</p>}</div>}
    {!selected && <CourseImportPanel imports={imports ?? []} role={role} error={importsError} onNotification={onNotification} />}
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-navy">{selected ? "Daftar lesson" : "Daftar course"}</h2><button type="button" disabled={busy} onClick={() => setDialog({ kind: selected ? "lesson" : "course" })} className={`${button} bg-navy text-white`}>Tambah {selected ? "Lesson" : "Course"}</button></div>
    {!selected && <p className="text-sm text-slate-600">Menerbitkan course akan menampilkan semua lesson Published di dalamnya. Menarik course ke Draft atau Arsip langsung menyembunyikan seluruh lesson.</p>}
    <div className="[&_button]:min-h-11 [&_input]:min-h-11"><ContentFilterBar currentFilter={filter} onFilterChange={setFilter} searchQuery={search} onSearchChange={setSearch} counts={counts} /></div>
    {filtered.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">{items.length === 0 ? `Belum ada ${selected ? "lesson dalam course ini" : "course"}.` : "Tidak ada materi sesuai pencarian atau filter."}</p> : <ul className="grid min-w-0 gap-4 lg:grid-cols-2">{filtered.map(item => <li key={item.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold text-navy">{"position" in item ? `${item.position}. ` : ""}{item.title}</h3><ContentStatusBadge status={item.status} /></div><p className="break-all text-xs text-slate-500">{item.slug}</p><p className="whitespace-pre-wrap break-words text-sm text-slate-600">{item.summary}</p>
      <div className="flex flex-wrap gap-2">{!selected && <button type="button" className={button} onClick={() => { setSelectedCourseId(item.id); setFilter("all"); setSearch(""); }}>Kelola lesson</button>}<button type="button" disabled={busy} className={button} onClick={() => setDialog({ kind: selected ? "lesson" : "course", item })}>Edit {selected ? "lesson" : "course"}</button>{role === "admin" && <button type="button" disabled={busy} className={`${button} text-red-700`} onClick={() => setDeleting(item)}>Hapus {selected ? "lesson" : "course"}</button>}</div>
      <div className="[&_button]:min-h-11 [&_[role=option]]:min-h-11"><SelectDropdown label={selected ? "Status lesson" : "Status course"} value={item.status} disabled={busy} onChange={status => { if (status !== item.status) void mutate({ entity, action: "status", id: item.id, status: status as Course["status"] }).catch(() => {}); }} options={[{ value: "draft", label: item.status === "archived" ? "Pulihkan ke Draft" : "Jadikan Draft" }, { value: "published", label: "Terbitkan" }, { value: "archived", label: "Arsipkan" }]} /></div>
    </li>)}</ul>}
    {dialog && <CourseMutationDialog key={`${dialog.kind}-${dialog.item?.id ?? "new"}`} kind={dialog.kind} courseId={selected?.id} courseTitle={selected?.title} initialData={dialog.item} isOpen isSaving={busy} onClose={() => setDialog(null)} onSave={save} />}
    {deleting && <DeleteConfirmationDialog key={deleting.id} isOpen onClose={() => { if (!pending.current) setDeleting(null); }} onConfirm={async () => { await mutate({ entity, action: "delete", id: deleting.id }); setDeleting(null); }} itemTitle={deleting.title} entityName={selected ? "Lesson" : "Course"} isDeleting={busy} />}
  </section>;
}
