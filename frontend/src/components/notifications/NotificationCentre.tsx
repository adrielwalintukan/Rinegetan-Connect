"use client";

// frontend/src/components/notifications/NotificationCentre.tsx
// P5-003: the preference centre jemaat uses to choose which church notifications arrive.
//
// Identity is the device (owner decision 2026-11-17): there is no account, and this
// component deliberately contains no email, phone or name field. Stopping removes the
// subscription for this device instead of storing an empty preference.
//
// The saved choice lives in an external store read through useSyncExternalStore, so the
// first render matches the server and no effect has to call setState.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clientErrorMessage } from "@/lib/api/errors";
import {
  canSubscribe,
  categoryOptions,
  centreCopy,
  summaryText,
  toStopBody,
  toSubscribeBody,
} from "@/lib/notifications/centre";
import { preferenceStore } from "@/lib/notifications/store";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** The browser's PushSubscription, in the shape the route expects. */
function serialize(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}

/** VAPID keys travel as base64url; the subscribe call wants raw bytes. */
function urlBase64ToUint8Array(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export function NotificationCentre() {
  const prefs = useSyncExternalStore(
    preferenceStore.subscribe,
    preferenceStore.getSnapshot,
    preferenceStore.getServerSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const alertRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error, errorCount]);

  const toggle = useCallback(
    (id: string, value: boolean) => {
      preferenceStore.set({ ...prefs, [id]: value });
      setMessage("");
    },
    [prefs],
  );

  const fail = useCallback((text: string) => {
    setError(text);
    setErrorCount((count) => count + 1);
  }, []);

  async function ensureSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;
    const existing = subscriptionRef.current ?? (await registration.pushManager.getSubscription());
    if (existing) {
      subscriptionRef.current = existing;
      return existing;
    }
    if (!VAPID_KEY) return null;
    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });
    subscriptionRef.current = created;
    return created;
  }

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      error?: string;
    };
    if (!response.ok || !json.success) {
      throw new Error(json.error || "Permintaan belum dapat dikirim. Silakan coba lagi.");
    }
    return json.message || "";
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const supported = "serviceWorker" in navigator && "PushManager" in window;
    const gate = canSubscribe({ hasPushManager: supported, hasVapidKey: Boolean(VAPID_KEY) });
    if (!gate.ok) return fail(gate.reason);

    setBusy(true);
    try {
      // Permission must be requested inside the click, before any other await.
      if (!("Notification" in window) || Notification.permission !== "granted") {
        const granted = "Notification" in window ? await Notification.requestPermission() : "denied";
        if (granted !== "granted") {
          return fail(
            "Izin notifikasi belum diberikan. Izinkan lewat pengaturan situs di browser, lalu coba lagi.",
          );
        }
      }

      const subscription = await ensureSubscription();
      if (!subscription) {
        return fail("Layanan notifikasi belum tersedia saat ini. Silakan coba lagi nanti.");
      }

      const text = await post("/api/notifikasi/langganan", toSubscribeBody(serialize(subscription), prefs));
      setMessage(text || "Preferensi notifikasi disimpan.");
    } catch (caught) {
      fail(clientErrorMessage(caught, "Preferensi belum dapat disimpan. Silakan coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  async function stopAll() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      const subscription =
        subscriptionRef.current ??
        (supported ? await (await navigator.serviceWorker.ready).pushManager.getSubscription() : null);
      if (!subscription) {
        // Nothing stored on this device: clearing the local choice is the whole action.
        preferenceStore.clear();
        setMessage("Belum ada langganan aktif di perangkat ini.");
        return;
      }
      const text = await post("/api/notifikasi/berhenti", toStopBody(subscription.endpoint));
      await subscription.unsubscribe();
      subscriptionRef.current = null;
      preferenceStore.clear();
      setMessage(text || "Notifikasi untuk perangkat ini sudah dihentikan.");
    } catch (caught) {
      fail(clientErrorMessage(caught, "Langganan belum dapat dihentikan. Silakan coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  const options = categoryOptions();

  return (
    <section aria-labelledby="notifikasi-title" className="max-w-2xl">
      <h2 id="notifikasi-title" className="text-2xl font-semibold text-navy">
        {centreCopy.heading}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-700">{centreCopy.intro}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{centreCopy.noAccount}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{centreCopy.identity}</p>

      {error && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <div role="status" className="mt-6 empty:hidden">
        {message && (
          <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</p>
        )}
      </div>

      <form onSubmit={save} noValidate className="mt-6 space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-navy">Kategori notifikasi</legend>
          {options.map((option) => (
            <div key={option.id} className="rounded-xl border border-navy/10 p-4">
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  name={option.id}
                  checked={prefs[option.id] === true}
                  onChange={(event) => toggle(option.id, event.target.checked)}
                  aria-describedby={`${option.id}-hint`}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-navy"
                />
                <span className="text-sm font-semibold text-navy">{option.label}</span>
              </label>
              <p id={`${option.id}-hint`} className="ml-9 mt-1 text-sm leading-relaxed text-slate-600">
                {option.description}
              </p>
            </div>
          ))}
        </fieldset>

        <p className="text-sm text-slate-600">{summaryText(prefs)}</p>
        <p className="text-sm leading-relaxed text-slate-600">{centreCopy.permission}</p>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="btn-primary min-h-11 disabled:opacity-60">
            {busy ? centreCopy.saving : centreCopy.save}
          </button>
          <button type="button" onClick={stopAll} disabled={busy} className="btn-secondary min-h-11 disabled:opacity-60">
            {centreCopy.stopAll}
          </button>
        </div>
        <p className="text-sm text-slate-600">{centreCopy.stopAllHint}</p>
      </form>
    </section>
  );
}
