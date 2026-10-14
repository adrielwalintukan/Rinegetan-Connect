"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sabbath-100 text-sabbath-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy">Halaman belum dapat ditampilkan</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Terjadi kendala saat memuat halaman ini. Data Anda tetap aman. Silakan coba lagi.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sabbath focus-visible:ring-offset-2"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-navy transition hover:bg-slate-50"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
