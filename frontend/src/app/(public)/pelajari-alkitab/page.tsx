import Link from "next/link";
import { connection } from "next/server";
import { GridGuides } from "@/components/layout/CreationGrid";
import { getPublicCourses } from "@/lib/courses/public-queries";
import { StudyInterestForm } from "@/components/learning/StudyInterestForm";

export async function generateMetadata() {
  await connection();
  return { title: "Pelajari Alkitab", description: "Baca pelajaran Alkitab yang tersedia, tanpa akun." };
}

export default async function BibleCatalogue() {
  await connection();
  const courses = await getPublicCourses();
  return <section className="relative py-12 lg:py-20" aria-labelledby="reader-title">
    <GridGuides />
    <div className="container-site relative grid gap-8 lg:grid-cols-7">
      <div className="min-w-0 break-words lg:col-span-6 [overflow-wrap:anywhere]">
        <p className="label-eyebrow">Belajar bersama</p>
        <h1 id="reader-title" className="mt-4 text-3xl font-bold text-navy sm:text-5xl">Pelajari Alkitab</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-slate-600">Baca pelajaran Alkitab yang tersedia, tanpa akun. Pilih materi dan belajar sesuai waktu Anda.</p>
        {courses.length === 0 ? <p className="mt-8 rounded-xl border border-navy/10 p-6">Belum ada materi yang tersedia. Silakan kunjungi kembali.</p> : <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {courses.map(course => <li key={course.id} className="card-surface min-w-0 p-6">
            <h2 className="text-xl font-semibold text-navy"><Link prefetch={false} href={`/pelajari-alkitab/${course.slug}`} className="inline-flex min-h-11 min-w-11 items-center underline decoration-sabbath-500 underline-offset-4">{course.title}</Link></h2>
            {course.summary && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{course.summary}</p>}
          </li>)}
        </ul>}
        <section id="ingin-belajar" aria-labelledby="ingin-belajar-title" className="mt-16 scroll-mt-24 border-t border-navy/10 pt-12">
          <h2 id="ingin-belajar-title" className="text-2xl font-bold text-navy sm:text-3xl">Ingin belajar bersama?</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">Tinggalkan nama dan kontak Anda. Admin gereja akan menghubungi Anda untuk belajar Alkitab bersama.</p>
          <StudyInterestForm />
        </section>
      </div>
    </div>
  </section>;
}
