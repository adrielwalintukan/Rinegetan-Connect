"use client";

import { useEffect, useState } from "react";
import { CACHE_STATUS_MESSAGE, storedCopyNotice } from "@/lib/pwa/cache-status.mjs";

// P5-002: a public page is network-first, so its stored copy is the one fetched on the visitor's
// last online visit. Someone who has not opened the site for days reads a days-old page while
// offline, and this is the line that says so.
//
// The age comes from the worker's stamp, not from `navigator.onLine`: being online says nothing
// about whether this particular page arrived fresh or came out of the cache.

type Status = { cachedAt: string | null } | null;

const ASK_TIMEOUT_MS = 2_000;

function askWorker(path: string): Promise<Status> {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve(null);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const done = (value: Status) => {
      channel.port1.close();
      resolve(value);
    };
    // A worker that never answers must not leave a promise hanging forever; the notice simply
    // stays hidden, which is the safe default.
    const timer = setTimeout(() => done(null), ASK_TIMEOUT_MS);

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      const data = event.data;
      done(data && typeof data.cachedAt === "string" ? { cachedAt: data.cachedAt } : null);
    };

    worker.postMessage({ type: CACHE_STATUS_MESSAGE, path }, [channel.port2]);
  });
}

export function StoredCopyNotice() {
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let cancelled = false;
    const check = () => {
      // Resolved inside a promise callback, so nothing is written to state during the effect body.
      void askWorker(window.location.pathname).then((status) => {
        if (cancelled) return;
        setNow(Date.now());
        setCachedAt(status?.cachedAt ?? null);
      });
    };

    // Waits for the worker to control the page; on a first visit there is no controller yet and
    // nothing was stored, so there is nothing to announce.
    check();
    navigator.serviceWorker.addEventListener("controllerchange", check);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", check);
    };
  }, []);

  const notice = storedCopyNotice({ cachedAt, now });

  const refresh = () => {
    // Network-first: a reload with a connection replaces the stored copy and clears the notice.
    window.location.reload();
  };

  const recover = () => {
    // The recovery path that already exists in the worker, now reachable without devtools.
    navigator.serviceWorker?.controller?.postMessage({ type: "RESET_CACHE" });
    window.location.reload();
  };

  if (!notice) return null;

  const stale = notice.startsWith("Salinan lama");

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="stored-copy-notice"
      className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-md sm:inset-x-auto sm:right-4 sm:top-4"
    >
      <p className="min-w-0 flex-1">{notice}</p>
      <button
        type="button"
        onClick={refresh}
        className="min-h-9 rounded-md bg-amber-900 px-3 py-1 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
      >
        Perbarui
      </button>
      {stale ? (
        <button
          type="button"
          onClick={recover}
          className="min-h-9 rounded-md border border-amber-900 px-3 py-1 font-semibold text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
        >
          Pulihkan
        </button>
      ) : null}
    </div>
  );
}
