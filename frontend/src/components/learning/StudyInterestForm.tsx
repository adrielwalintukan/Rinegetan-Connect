"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clientErrorMessage } from "@/lib/api/errors";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

type Field = "name" | "contact" | "message" | "consent" | "turnstile";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const inputClass = "mt-2 block min-h-11 w-full rounded-lg border border-navy/20 bg-white px-4 py-2 text-base text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-sabbath-500 aria-[invalid=true]:border-red-600";

// Copy is a draft (consent version draft-2026-10-26) awaiting church approval before production.
export function StudyInterestForm() {
  const [values, setValues] = useState({ name: "", contact: "", message: "", consent: false, website: "" });
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const alertRef = useRef<HTMLDivElement>(null);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !widgetRef.current || !window.turnstile || widgetId.current !== undefined) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: SITE_KEY, language: "id", callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken(""),
    });
  }, []);
  useEffect(renderWidget, [renderWidget]);
  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError]);

  if (!SITE_KEY) {
    return <p className="mt-6 rounded-xl border border-navy/10 p-6 text-slate-600">
      Formulir belum tersedia. Silakan hubungi gereja melalui halaman{" "}
      <Link prefetch={false} href="/kontak" className="inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-4">Kontak</Link>.
    </p>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({}); setFormError(""); setSuccess("");
    if (!values.consent) { setErrors({ consent: "Centang persetujuan untuk melanjutkan." }); setFormError("Periksa kembali isian Anda."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/minat-belajar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken: token }),
      });
      const json = await response.json() as { success?: boolean; message?: string; error?: string; field?: Field };
      if (!response.ok || !json.success) {
        if (json.field) setErrors({ [json.field]: json.error });
        setFormError(json.error || "Permintaan belum dapat dikirim. Silakan coba lagi.");
        return;
      }
      setValues({ name: "", contact: "", message: "", consent: false, website: "" });
      setSuccess(json.message || "Terima kasih. Tim kami akan menghubungi Anda.");
    } catch (error) {
      setFormError(clientErrorMessage(error, "Permintaan belum dapat dikirim. Silakan coba lagi."));
    } finally {
      setBusy(false); setToken("");
      window.turnstile?.reset(widgetId.current);
    }
  }

  const describe = (field: Field) => errors[field] ? `${field}-error` : undefined;
  const errorText = (field: Field) => errors[field] && <p id={`${field}-error`} className="mt-1 text-sm text-red-700">{errors[field]}</p>;

  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget} onReady={renderWidget} />
    <div className="mt-4 max-w-2xl space-y-2 text-sm leading-relaxed text-slate-600">
      <p>Data ini hanya dipakai Admin gereja untuk menghubungi Anda tentang belajar Alkitab bersama, dan tidak dibagikan kepada pihak lain.</p>
      <p>Data disimpan paling lama 24 bulan, lalu dihapus.</p>
    </div>
    {formError && <div ref={alertRef} tabIndex={-1} role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{formError}</div>}
    <div role="status" className="mt-6 empty:hidden">{success && <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}</div>
    <form onSubmit={submit} noValidate className="mt-6 grid max-w-2xl gap-5">
      <div>
        <label htmlFor="interest-name" className="text-sm font-semibold text-navy">Nama</label>
        <input id="interest-name" name="name" autoComplete="name" required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })}
          aria-invalid={Boolean(errors.name)} aria-describedby={describe("name")} className={inputClass} />
        {errorText("name")}
      </div>
      <div>
        <label htmlFor="interest-contact" className="text-sm font-semibold text-navy">Nomor WhatsApp atau email</label>
        <input id="interest-contact" name="contact" autoComplete="email" inputMode="email" required value={values.contact} onChange={(e) => setValues({ ...values, contact: e.target.value })}
          aria-invalid={Boolean(errors.contact)} aria-describedby={describe("contact")} className={inputClass} />
        {errorText("contact")}
      </div>
      <div>
        <label htmlFor="interest-message" className="text-sm font-semibold text-navy">Pesan (opsional)</label>
        <textarea id="interest-message" name="message" rows={4} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })}
          aria-invalid={Boolean(errors.message)} aria-describedby={describe("message")} className={inputClass} />
        {errorText("message")}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="interest-website">Situs web</label>
        <input id="interest-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} />
      </div>
      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="consent" checked={values.consent} onChange={(e) => setValues({ ...values, consent: e.target.checked })}
            aria-invalid={Boolean(errors.consent)} aria-describedby={describe("consent")} className="mt-0.5 h-6 w-6 shrink-0 accent-navy" />
          <span>Saya setuju data ini disimpan dan dipakai untuk dihubungi sesuai penjelasan di atas.</span>
        </label>
        {errorText("consent")}
      </div>
      <div>
        <div ref={widgetRef} />
        {errorText("turnstile")}
      </div>
      <button type="submit" disabled={busy} className="btn-primary min-h-11 justify-self-start disabled:opacity-60">{busy ? "Mengirim…" : "Kirim"}</button>
    </form>
  </>;
}
