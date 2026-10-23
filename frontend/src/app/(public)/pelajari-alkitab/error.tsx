"use client";

export default function ReaderError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="container-site py-16" role="alert">
    <h1 className="text-3xl font-bold text-navy">Materi belum dapat dimuat</h1>
    <p className="mt-4 text-slate-600">Silakan coba lagi beberapa saat lagi.</p>
    <button type="button" onClick={reset} className="btn-primary mt-6 min-h-11">Coba lagi</button>
  </section>;
}
