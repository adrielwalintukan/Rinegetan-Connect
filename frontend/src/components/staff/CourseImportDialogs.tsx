"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";
import { clientErrorMessage } from "@/lib/api/errors";
import { MAX_IMPORT_BYTES } from "@/lib/courses/imports";

const button = "min-h-11 min-w-11 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50";
const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-slate-100";

/** Focus the first control on open, trap Tab inside, restore focus on close — same contract as CourseMutationDialog. */
function useDialogFocus(isOpen: boolean, busy: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  // The focused submit button becomes disabled while busy; keep focus inside the trap.
  useEffect(() => { if (busy) panel.current?.focus(); }, [busy]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input, textarea, button")?.focus(), 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)") ?? []);
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
  };
  return { panel, onKeyDown };
}

export function CourseImportUploadDialog({ isOpen, onClose, onUploaded }: { isOpen: boolean; onClose: () => void; onUploaded: () => void }) {
    const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { panel, onKeyDown } = useDialogFocus(isOpen, busy);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!file) { setError("Pilih berkas JSON terlebih dahulu."); return; }
    if (file.size > MAX_IMPORT_BYTES) { setError("Berkas impor melebihi batas 2 MB."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/staff/course-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: file });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success !== true) throw new Error(typeof json.error === "string" ? json.error : "Gagal mengunggah berkas impor.");
      onUploaded();
    } catch (err) { setError(clientErrorMessage(err, "Gagal mengunggah berkas impor.")); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} className={MODAL_BACKDROP} labelledBy="course-import-title">
    <div ref={panel} tabIndex={-1} onKeyDown={onKeyDown} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6">
      <h2 id="course-import-title" className="text-lg font-bold text-navy">Impor course dari JSON</h2>
      <p className="mt-2 text-sm text-slate-600">Berkas satu course berformat <code>rinegetan-course-import/1</code>, maksimal 2 MB dan 100 lesson. Hasil impor menunggu persetujuan lisensi Admin dan dibuat sebagai Draft.</p>
      {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Berkas JSON<input type="file" accept="application/json,.json" disabled={busy} className={field} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-slate-300`}>Batal</button>
          <button type="submit" disabled={busy} className={`${button} bg-navy text-white`}>{busy ? "Mengunggah..." : "Unggah untuk ditinjau"}</button>
        </div>
      </form>
    </div>
  </Modal>;
}

export function CourseImportDecisionDialog({ mode, isOpen, title, onClose, onConfirm }: {
  mode: "approve" | "reject"; isOpen: boolean; title: string; onClose: () => void; onConfirm: (note?: string) => Promise<void>;
}) {
    const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { panel, onKeyDown } = useDialogFocus(isOpen, busy);
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === "reject" && !note.trim()) { setError("Alasan penolakan wajib diisi."); return; }
    setBusy(true); setError(null);
    try { await onConfirm(mode === "reject" ? note : undefined); }
    catch (err) { setError(clientErrorMessage(err, "Gagal menyimpan keputusan impor.")); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} className={MODAL_BACKDROP} labelledBy="course-import-decision-title">
    <div ref={panel} tabIndex={-1} onKeyDown={onKeyDown} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6">
      <h2 id="course-import-decision-title" className="break-words text-lg font-bold text-navy">{mode === "approve" ? "Setujui lisensi impor" : "Tolak impor"}: {title}</h2>
      <p className="mt-2 text-sm text-slate-600">{mode === "approve"
        ? "Pastikan sumber dan izin pakai sudah diperiksa. Course dan semua lesson akan dibuat sebagai Draft; terbitkan lewat pengelola course."
        : "Impor tidak akan dibuat menjadi course. Editor dapat mengunggah ulang berkas yang sudah diperbaiki."}</p>
      {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={confirm} className="mt-4 space-y-4">
        {mode === "reject" && <label className="block text-sm font-semibold text-slate-700">Alasan penolakan<textarea value={note} maxLength={500} rows={3} disabled={busy} onChange={event => setNote(event.target.value)} className={field} /></label>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-slate-300`}>Batal</button>
          <button type="submit" disabled={busy} className={`${button} ${mode === "approve" ? "bg-navy" : "bg-red-600"} text-white`}>{busy ? "Menyimpan..." : mode === "approve" ? "Setujui dan buat Draft" : "Tolak impor"}</button>
        </div>
      </form>
    </div>
  </Modal>;
}
