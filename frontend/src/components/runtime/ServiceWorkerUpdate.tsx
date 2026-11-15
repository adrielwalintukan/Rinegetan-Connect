"use client";

import { useEffect, useRef, useState } from "react";
import { shouldAnnounceUpdate, shouldReloadOnControllerChange } from "@/lib/pwa/update.mjs";

// P5-001: the worker is registered from the public layout only. The staff area is never given a
// service worker, so an authenticated page cannot end up cached and replayed to another user on
// the same device.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export function ServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState(false);
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let cancelled = false;
    // Whether this page was already controlled when it loaded. The first `clients.claim()` also
    // fires `controllerchange`, and reloading there would restart the page under a visitor who
    // just arrived for no reason.
    const controlledOnLoad = Boolean(navigator.serviceWorker.controller);

    const track = (worker: ServiceWorker | null) => {
      if (!worker || cancelled) return;
      if (shouldAnnounceUpdate({ state: worker.state, hasController: Boolean(navigator.serviceWorker.controller) })) {
        setWaiting(true);
      }
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${BUILD_ID}`, { scope: "/", updateViaCache: "none" })
      .then((registered) => {
        if (cancelled) return;
        track(registered.waiting);
        registered.addEventListener("updatefound", () => track(registered.installing));
      })
      .catch(() => {
        // Registration is an enhancement; a failure must not surface as a broken page.
      });

    // If the worker was replaced while this page stayed open, reload once so the visitor is not
    // left on a shell whose cached assets are already gone.
    const onControllerChange = () => {
      if (!shouldReloadOnControllerChange({ controlledOnLoad, alreadyReloading: reloading.current })) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    // `controllerchange` performs the reload; a second call here would reload twice.
    setWaiting(false);
  };

  if (!waiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="sw-update-banner"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-navy/15 bg-white px-4 py-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <p className="min-w-0 flex-1 text-sm text-slate-700">Versi baru situs ini sudah tersedia.</p>
      <button
        type="button"
        onClick={applyUpdate}
        className="min-h-11 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Muat ulang
      </button>
    </div>
  );
}
