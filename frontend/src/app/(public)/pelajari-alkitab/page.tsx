import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { getPublicCourses } from "@/lib/courses/public-queries";
import { StudyInterestForm } from "@/components/learning/StudyInterestForm";

export async function generateMetadata() {
  await connection();
  return {
    title: "Pelajari Alkitab",
    description: "Baca pelajaran Alkitab yang tersedia, tanpa akun.",
    alternates: { canonical: "/pelajari-alkitab" },
    openGraph: {
      url: "/pelajari-alkitab",
      images: ["/opengraph-image"],
      title: "Pelajari Alkitab | GMAHK Rinegetan",
      description: "Baca pelajaran Alkitab yang tersedia, tanpa akun.",
    },
  };
}

export default async function BibleCatalogue() {
  await connection();
  const courses = await getPublicCourses();
  return <section className="pb-20 sm:pb-28" aria-labelledby="reader-title">
    <PageHero
      eyebrow="Belajar bersama"
      titleId="reader-title"
      title={<>Pelajari <Accent>Alkitab</Accent></>}
      description="Baca pelajaran Alkitab yang tersedia, tanpa akun. Pilih materi dan belajar sesuai waktu Anda."
    >
      <a href="#ingin-belajar" className="btn-sabbath">Ingin belajar bersama?</a>
    </PageHero>
    <div className="mx-auto w-full min-w-0 max-w-[96rem] break-words px-5 sm:px-8 lg:px-12 [overflow-wrap:anywhere]">
      {courses.length === 0 ? <p className="rounded-2xl border border-navy/[0.08] bg-white p-7 text-slate-600">Belum ada materi yang tersedia. Silakan kunjungi kembali.</p> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course, i) => <li key={course.id} className="group relative flex min-w-0 flex-col rounded-2xl border border-navy/[0.08] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-sabbath-500/40">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-sabbath-400"><BookOpen className="h-5 w-5" aria-hidden="true" /></span>
            <span className="font-mono text-xs text-slate-500" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <h2 className="mt-6 text-xl font-semibold tracking-tight text-navy">
            {/* The ::after makes the whole card the link target. */}
            <Link prefetch={false} href={`/pelajari-alkitab/${course.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-navy">{course.title}</Link>
          </h2>
          {course.summary && <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{course.summary}</p>}
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sabbath-700" aria-hidden="true">Mulai belajar <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" /></span>
        </li>)}
      </ul>}
      <section id="ingin-belajar" aria-labelledby="ingin-belajar-title" className="mt-16 scroll-mt-28 rounded-2xl border border-sabbath-500/30 bg-sabbath-50 p-6 sm:p-10 lg:p-12">
        <p className="label-eyebrow">Gratis · tanpa tekanan</p>
        <h2 id="ingin-belajar-title" className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Ingin belajar bersama?</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">Tinggalkan nama dan kontak Anda. Admin gereja akan menghubungi Anda untuk belajar Alkitab bersama.</p>
        <div className="max-w-2xl"><StudyInterestForm /></div>
      </section>
    </div>
  </section>;
}
