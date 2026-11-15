import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

// Served by the service worker when a navigation fails and the page was never cached.
// Deliberately static and dependency-free: anything dynamic could fail for the same reason the
// visitor is seeing this page.
export const metadata: Metadata = {
  title: "Anda sedang offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <PageShell>
      <section className="mx-auto flex max-w-2xl flex-col justify-center px-5 py-24 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sabbath-700">Tanpa koneksi</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy sm:text-4xl">Anda sedang offline</h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          Halaman ini belum tersimpan di perangkat Anda. Sambungkan internet untuk membuka halaman
          yang Anda tuju. Halaman yang pernah Anda buka tetap dapat dibaca.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 w-fit items-center rounded-md bg-navy px-5 py-2.5 font-semibold text-white underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
        >
          Kembali ke beranda
        </Link>
      </section>
    </PageShell>
  );
}
