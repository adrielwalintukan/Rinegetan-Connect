import Link from "next/link";

export default function ReaderNotFound() {
  return <section className="container-site py-16">
    <h1 className="text-3xl font-bold text-navy">Materi tidak ditemukan</h1>
    <p className="mt-4 text-slate-600">Materi belum tersedia atau sudah ditarik dari publik.</p>
    <Link prefetch={false} href="/pelajari-alkitab" className="btn-primary mt-6 min-h-11">Kembali ke daftar materi</Link>
  </section>;
}
