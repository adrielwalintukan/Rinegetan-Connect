"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { clientErrorMessage } from "@/lib/api/errors";
import { TURNSTILE_SCRIPT, TURNSTILE_SITE_KEY, useTurnstile } from "./useTurnstile";

type Field = "name" | "contact" | "request" | "consent" | "turnstile";
const EMPTY = { name: "", contact: "", request: "", wantsContact: false, consent: false, website: "" };
const inputClass = "mt-2 block min-h-11 w-full rounded-lg border border-navy/20 bg-white px-4 py-2 text-base text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-sabbath-500 aria-[invalid=true]:border-red-600";

// Copy is a draft (consent version draft-2026-11-02) awaiting church approval before production.
export function PrayerRequestForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const { token, ref: widgetRef, render: renderWidget, reset: resetWidget } = useTurnstile();
  // errorCount re-focuses the alert even when the same message repeats.
  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError, errorCount]);

  if (!TURNSTILE_SITE_KEY) {
    return <p className="mt-4 text-sm text-slate-600">
      Formulir belum tersedia. Silakan sampaikan permohonan doa langsung kepada pengurus jemaat atau lewat{" "}
      <Link prefetch={false} href="#kontak-gereja" className="inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-4">kontak gereja</Link>.
    </p>;
  }

  function fail(message: string, field?: Field) {
    if (field) setErrors({ [field]: message });
    setFormError(message);
    setErrorCount((n) => n + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({}); setFormError(""); setSuccess("");
    if (!values.consent) { setErrors({ consent: "Centang persetujuan untuk melanjutkan." }); fail("Periksa kembali isian Anda."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/doa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken: token }),
      });
      const json = await response.json() as { success?: boolean; message?: string; error?: string; field?: Field };
      if (!response.ok || !json.success) { fail(json.error || "Permohonan belum dapat dikirim. Silakan coba lagi.", json.field); return; }
      setValues(EMPTY);
      setSuccess(json.message || "Terima kasih. Permohonan doa Anda sudah kami terima.");
    } catch (error) {
      fail(clientErrorMessage(error, "Permohonan belum dapat dikirim. Silakan coba lagi."));
    } finally {
      setBusy(false); resetWidget();
    }
  }

  const describe = (field: Field) => errors[field] ? `prayer-${field}-error` : undefined;
  const errorText = (field: Field) => errors[field] && <p id={`prayer-${field}-error`} className="mt-1 text-sm text-red-700">{errors[field]}</p>;

  return <>
    <Script src={TURNSTILE_SCRIPT} strategy="afterInteractive" onLoad={renderWidget} onReady={renderWidget} />
    <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
      <p>Permohonan doa hanya dibaca Admin gereja untuk didoakan dan, bila Anda minta, untuk menghubungi Anda. Permohonan tidak dipublikasikan dan tidak dibagikan kepada pihak lain.</p>
      <p>Nama dan kontak boleh dikosongkan. Data disimpan paling lama 24 bulan, lalu dihapus.</p>
    </div>
    {formError && <div ref={alertRef} tabIndex={-1} role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{formError}</div>}
    <div role="status" className="mt-6 empty:hidden">{success && <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}</div>
    <form onSubmit={submit} noValidate className="mt-6 grid gap-5">
      <div>
        <label htmlFor="prayer-request" className="text-sm font-semibold text-navy">Permohonan doa</label>
        <textarea id="prayer-request" name="request" rows={5} required value={values.request} onChange={(e) => setValues({ ...values, request: e.target.value })}
          aria-invalid={Boolean(errors.request)} aria-describedby={describe("request")} className={inputClass} />
        {errorText("request")}
      </div>
      <div>
        <label htmlFor="prayer-name" className="text-sm font-semibold text-navy">Nama (opsional)</label>
        <input id="prayer-name" name="name" autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })}
          aria-invalid={Boolean(errors.name)} aria-describedby={describe("name")} className={inputClass} />
        {errorText("name")}
      </div>
      <div>
        <label htmlFor="prayer-contact" className="text-sm font-semibold text-navy">Nomor WhatsApp atau email (opsional)</label>
        <input id="prayer-contact" name="contact" autoComplete="email" inputMode="email" value={values.contact}
          onChange={(e) => setValues({ ...values, contact: e.target.value, wantsContact: e.target.value.trim() ? values.wantsContact : false })}
          aria-invalid={Boolean(errors.contact)} aria-describedby={describe("contact")} className={inputClass} />
        {errorText("contact")}
      </div>
      <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="wantsContact" checked={values.wantsContact} disabled={!values.contact.trim()}
          onChange={(e) => setValues({ ...values, wantsContact: e.target.checked })} className="mt-0.5 h-6 w-6 shrink-0 accent-navy disabled:opacity-50" />
        <span>Saya ingin dihubungi</span>
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="prayer-website">Situs web</label>
        <input id="prayer-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} />
      </div>
      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="consent" checked={values.consent} onChange={(e) => setValues({ ...values, consent: e.target.checked })}
            aria-invalid={Boolean(errors.consent)} aria-describedby={describe("consent")} className="mt-0.5 h-6 w-6 shrink-0 accent-navy" />
          <span>Saya setuju data ini disimpan dan dipakai sesuai penjelasan di atas.</span>
        </label>
        {errorText("consent")}
      </div>
      <div>
        <div ref={widgetRef} />
        {errorText("turnstile")}
      </div>
      <button type="submit" disabled={busy} className="btn-primary min-h-11 justify-self-start disabled:opacity-60">{busy ? "Mengirim…" : "Kirim permohonan"}</button>
    </form>
  </>;
}
