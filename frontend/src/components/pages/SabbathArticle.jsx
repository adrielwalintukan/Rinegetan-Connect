"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Reader article plus a verse popup. Upstream verse references arrive as inert `<a>` and are
 * converted to `<button data-verse>` on the server, so one delegated click handler covers them.
 */
export default function SabbathArticle({ html, verses = {}, className = "" }) {
  const dialog = useRef(null);
  const [verse, setVerse] = useState(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return undefined;
    if (!verse) {
      if (node.open) node.close();
      return undefined;
    }
    if (!node.open) node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [verse]);

  const open = event => {
    const trigger = event.target.closest("[data-verse]");
    if (trigger && verses[trigger.dataset.verse]) {
      setVerse({ reference: trigger.dataset.verse, label: trigger.textContent.trim() });
    }
  };

  return (
    <>
      <article data-testid="sabbath-reading" onClick={open} className={className} dangerouslySetInnerHTML={{ __html: html }} />
      <dialog
        ref={dialog}
        aria-label={verse ? `Ayat ${verse.label}` : undefined}
        onClose={() => setVerse(null)}
        onClick={event => { if (event.target === dialog.current) setVerse(null); }}
        className="w-[min(34rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl border border-navy/10 bg-white p-0 shadow-2xl backdrop:bg-navy/60 backdrop:backdrop-blur-sm"
      >
        {verse && <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="label-eyebrow text-sabbath-700">Ayat Alkitab</p>
            <button
              type="button"
              onClick={() => setVerse(null)}
              aria-label="Tutup ayat"
              className="-mr-2 -mt-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div
            className="mt-2 text-base leading-7 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-navy [&_h2:first-child]:mt-0 [&_sup]:align-super [&_sup]:text-[0.6875rem] [&_sup]:text-slate-500"
            dangerouslySetInnerHTML={{ __html: verses[verse.reference] }}
          />
        </div>}
      </dialog>
    </>
  );
}
