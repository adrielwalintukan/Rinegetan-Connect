"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { clientErrorMessage } from "@/lib/api/errors";
import { TURNSTILE_SCRIPT, TURNSTILE_SITE_KEY, useTurnstile } from "./useTurnstile";

type Field = "name" | "contact" | "visitDate" | "partySize" | "message" | "consent" | "turnstile";
const EMPTY = { name: "", contact: "", visitDate: "", partySize: "", message: "", consent: false, website: "" };
const inputClass = "mt-2 block min-h-11 w-full rounded-lg border border-navy/20 bg-white px-4 py-2 text-base text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-sabbath-500 aria-[invalid=true]:border-red-600";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());

// Copy is a draft (consent version draft-2026-11-02) awaiting church approval before production.
export function VisitForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const { token, ref: widgetRef, render: renderWidget, reset: resetWidget } = useTurnstile();
  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError, errorCount]);

  if (!TURNSTILE_SITE_KEY) {
    return <p className="mt-4 text-sm text-slate-600">
      Formulir belum tersedia. Silakan hubungi kami lewat{" "}
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
      const response = await fetch("/api/kunjungan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, partySize: values.partySize === "" ? "" : Number(values.partySize), turnstileToken: token }),
      });
      const json = await response.json() as { success?: boolean; message?: string; error?: string; field?: Field };
      if (!response.ok || !json.success) { fail(json.error || "Data kunjungan belum dapat dikirim. Silakan coba lagi.", json.field); return; }
      setValues(EMPTY);
      setSuccess(json.message || "Terima kasih. Tim kami akan menghubungi Anda untuk menyambut kunjungan Anda.");
    } catch (error) {
      fail(clientErrorMessage(error, "Data kunjungan belum dapat dikirim. Silakan coba lagi."));
    } finally {
      setBusy(false); resetWidget();
    }
  }

  const describe = (field: Field) => errors[field] ? `visit-${field}-error` : undefined;
  const errorText = (field: Field) => errors[field] && <p id={`visit-${field}-error`} className="mt-1 text-sm text-red-700">{errors[field]}</p>;

  return <>
    <Script src={TURNSTILE_SCRIPT} strategy="afterInteractive" onLoad={renderWidget} onReady={renderWidget} />
    <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
      <p>Data ini hanya dipakai Admin gereja untuk menyambut dan menghubungi Anda tentang kunjungan, dan tidak dibagikan kepada pihak lain.</p>
      <p>Data disimpan paling lama 24 bulan, lalu dihapus.</p>
    </div>
    {formError && <div ref={alertRef} tabIndex={-1} role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{formError}</div>}
    <div role="status" className="mt-6 empty:hidden">{success && <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}</div>
    <form onSubmit={submit} noValidate className="mt-6 grid gap-5">
      <div>
        <label htmlFor="visit-name" className="text-sm font-semibold text-navy">Nama</label>
        <input id="visit-name" name="name" autoComplete="name" required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })}
          aria-invalid={Boolean(errors.name)} aria-describedby={describe("name")} className={inputClass} />
        {errorText("name")}
      </div>
      <div>
        <label htmlFor="visit-contact" className="text-sm font-semibold text-navy">Nomor WhatsApp atau email</label>
        <input id="visit-contact" name="contact" autoComplete="email" inputMode="email" required value={values.contact} onChange={(e) => setValues({ ...values, contact: e.target.value })}
          aria-invalid={Boolean(errors.contact)} aria-describedby={describe("contact")} className={inputClass} />
        {errorText("contact")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="visit-date" className="text-sm font-semibold text-navy">Rencana tanggal kunjungan (opsional)</label>
          <input id="visit-date" name="visitDate" type="date" min={today()} suppressHydrationWarning value={values.visitDate} onChange={(e) => setValues({ ...values, visitDate: e.target.value })}
            aria-invalid={Boolean(errors.visitDate)} aria-describedby={describe("visitDate")} className={inputClass} />
          {errorText("visitDate")}
        </div>
        <div>
          <label htmlFor="visit-party" className="text-sm font-semibold text-navy">Jumlah orang (opsional)</label>
          <input id="visit-party" name="partySize" type="number" inputMode="numeric" min={1} max={20} step={1} value={values.partySize} onChange={(e) => setValues({ ...values, partySize: e.target.value })}
            aria-invalid={Boolean(errors.partySize)} aria-describedby={describe("partySize")} className={inputClass} />
          {errorText("partySize")}
        </div>
      </div>
      <div>
        <label htmlFor="visit-message" className="text-sm font-semibold text-navy">Pesan (opsional)</label>
        <textarea id="visit-message" name="message" rows={3} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })}
          aria-invalid={Boolean(errors.message)} aria-describedby={describe("message")} className={inputClass} />
        {errorText("message")}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="visit-website">Situs web</label>
        <input id="visit-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues({ ...values, website: e.target.value })} />
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
