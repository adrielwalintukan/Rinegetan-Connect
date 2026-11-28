"use client";

import { useEffect, useRef, useState } from "react";
import { shouldActivateSilently, shouldAnnounceUpdate, shouldReloadOnControllerChange } from "@/lib/pwa/update.mjs";

// P5-001: the worker is registered from the public layout only. The staff area is never given a
// service worker, so an authenticated page cannot end up cached and replayed to another user on
// the same device.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export function ServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState(false);
  const reloading = useRef(false);
  const silentUpdate = useRef(false);
  // The worker parked behind the active one. A ref, not state: it is used inside the click handler
  // and must not trigger a render when the browser hands us a new worker object.
  const waitingWorker = useRef<ServiceWorker | null>(null);
  // The live registration. A deploy can install a second worker over the first while the banner is
  // already on screen, which leaves `waitingWorker` pointing at a worker that is no longer waiting.
  // The registration's own slot is the source of truth at click time.
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let cancelled = false;
    // Whether this page was already controlled when it loaded. The first `clients.claim()` also
    // fires `controllerchange`, and reloading there would restart the page under a visitor who
    // just arrived for no reason.
    const controlledOnLoad = Boolean(navigator.serviceWorker.controller);

    const track = (worker: ServiceWorker | null) => {
      if (!worker || cancelled) return;
      // `updatefound` fires while the new worker is still installing, so this has to be re-checked
      // on every state change. Evaluating only once would leave the banner permanently hidden:
      // at `updatefound` the state is "installing", never "installed".
      const check = () => {
        if (cancelled) return;
        const input = {
          state: worker.state,
          hasController: Boolean(navigator.serviceWorker.controller),
          workerBuild: new URL(worker.scriptURL).searchParams.get("v"),
          pageBuild: BUILD_ID,
        };
        // A refresh after a deploy already shows the new release (network-first), so asking the
        // visitor to reload again would only make them refresh twice.
        if (shouldActivateSilently(input)) {
          silentUpdate.current = true;
          worker.postMessage({ type: "SKIP_WAITING" });
          return;
        }
        if (shouldAnnounceUpdate(input)) {
          waitingWorker.current = worker;
          setWaiting(true);
        }
      };
      worker.addEventListener("statechange", check);
      check();
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${BUILD_ID}`, { scope: "/", updateViaCache: "none" })
      .then((registered) => {
        if (cancelled) return;
        registrationRef.current = registered;
        // A worker already parked in the waiting slot means a previous visit installed an update
        // that was never applied.
        if (registered.waiting) {
          waitingWorker.current = registered.waiting;
          track(registered.waiting);
        }
        registered.addEventListener("updatefound", () => track(registered.installing));
      })
      .catch(() => {
        // Registration is an enhancement; a failure must not surface as a broken page.
      });

    // If the worker was replaced while this page stayed open, reload once so the visitor is not
    // left on a shell whose cached assets are already gone.
    const onControllerChange = () => {
      if (!shouldReloadOnControllerChange({ controlledOnLoad, alreadyReloading: reloading.current, silentUpdate: silentUpdate.current })) return;
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
    // The waiting worker is the one that needs activating; the active worker has nothing to skip.
    // Prefer the registration's current slot: during a deploy the browser can replace the waiting
    // worker after the banner appeared, and messaging the stale object would do nothing at all,
    // leaving the button looking dead.
    const target = registrationRef.current?.waiting ?? waitingWorker.current;
    target?.postMessage({ type: "SKIP_WAITING" });
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
