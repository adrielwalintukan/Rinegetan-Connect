"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NOTE_MAX_LENGTH, getNote, noteKey, readNotesState, setNote, writeNotesState } from "@/lib/sabbath/notes.mjs";

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

/**
 * Per-reading-day note kept in this browser only, mirroring Pelajari Alkitab: no account, no server.
 * The panel stays collapsed so the article stays the focus and the stored text cannot flash in on load.
 */
export default function SabbathNotes({ quarterId, lessonId, dayId, dayTitle }) {
  const key = noteKey(quarterId, lessonId, dayId);
  const [open, setOpen] = useState(false);
  const [note, setNoteText] = useState("");
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [saved, setSaved] = useState(true);
  const timer = useRef(0);
  const pending = useRef(null);

  useEffect(() => {
    const stored = readNotesState(browserStorage());
    // Hydration synchronizes external storage after SSR, once per mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNoteText(getNote(stored.state, key));
    setPersistent(stored.persistent);
    setReady(true);
  }, [key]);

  // Debounced so typing does not hit storage on every keystroke.
  const schedule = useCallback((value) => {
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const storage = browserStorage();
      const stored = readNotesState(storage);
      setPersistent(writeNotesState(storage, setNote(stored.state, key, value)));
      pending.current = null;
      setSaved(true);
    }, 600);
  }, [key]);

  // Used by every exit path: pagehide, visibilitychange, and unmount. The status must settle here
  // too, otherwise a backgrounded tab comes back showing "Menyimpan…" for a note already on disk.
  const flush = useCallback(() => {
    if (pending.current === null) return;
    window.clearTimeout(timer.current);
    const value = pending.current;
    pending.current = null;
    const storage = browserStorage();
    setPersistent(writeNotesState(storage, setNote(readNotesState(storage).state, key, value)));
    setSaved(true);
  }, [key]);

  // The prev/next links in the reader are plain <a> elements, so leaving a day is a full-document
  // navigation: the browser tears the page down and React never runs its cleanup. pagehide is the
  // event that still fires first, and visibilitychange covers a backgrounded tab being discarded.
  // The unmount flush stays for client-side navigation, where pagehide does not fire.
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    // A page restored from the back/forward cache keeps its React state, so the status could stay
    // on "Menyimpan…" after a flush that already happened. Re-sync from storage on restore.
    const show = (event) => {
      if (!event.persisted) return;
      const stored = readNotesState(browserStorage());
      setNoteText(getNote(stored.state, key));
      setSaved(true);
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("pageshow", show);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("visibilitychange", hide);
      window.clearTimeout(timer.current);
      flush();
    };
  }, [flush, key]);

  const change = (event) => {
    const value = event.target.value;
    setNoteText(value);
    setSaved(false);
    schedule(value);
  };

  const remove = () => {
    window.clearTimeout(timer.current);
    pending.current = null;
    setNoteText("");
    setSaved(true);
    const storage = browserStorage();
    setPersistent(writeNotesState(storage, setNote(readNotesState(storage).state, key, "")));
  };

  return (
    <section aria-label="Catatan saya" className="mt-10 rounded-xl border border-navy/10 bg-white">
      <h2 className="m-0">
        <button type="button" aria-expanded={open} aria-controls="sabbath-note-panel"
          onClick={() => setOpen(value => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">
          <span>Catatan saya</span>
          <span className="text-sm font-normal text-slate-600">{note.trim() ? "Ada catatan" : "Belum ada catatan"} · {open ? "Tutup" : "Buka"}</span>
        </button>
      </h2>
      {open && <div id="sabbath-note-panel" className="border-t border-navy/10 px-5 py-4">
        <label htmlFor="sabbath-note" className="block text-sm font-semibold text-slate-700">Catatan untuk {dayTitle}</label>
        <textarea id="sabbath-note" value={note} onChange={change} maxLength={NOTE_MAX_LENGTH} rows={6} disabled={!ready}
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-base leading-relaxed text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Tersimpan otomatis di browser ini saja — dapat hilang jika data situs dibersihkan.</p>
          {note && <button type="button" onClick={remove} className="min-h-11 rounded-md px-2 font-semibold text-navy underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">Hapus catatan</button>}
        </div>
        <p role="status" aria-live="polite" className="mt-1 text-sm text-slate-600">
          {!ready ? "" : !persistent ? "Penyimpanan browser tidak tersedia. Catatan tidak tersimpan." : saved ? `${Array.from(note).length}/${NOTE_MAX_LENGTH} karakter` : "Menyimpan…"}
        </p>
      </div>}
    </section>
  );
}
