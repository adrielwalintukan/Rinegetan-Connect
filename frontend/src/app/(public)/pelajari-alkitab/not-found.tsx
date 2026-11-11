import BackLink from "@/components/ui/BackLink";

export default function ReaderNotFound() {
  return <section className="container-site py-16">
    <h1 className="text-3xl font-bold text-navy">Materi tidak ditemukan</h1>
    <p className="mt-4 text-slate-600">Materi belum tersedia atau sudah ditarik dari publik.</p>
    <BackLink href="/pelajari-alkitab" className="mt-6">Kembali ke daftar materi</BackLink>
  </section>;
}
