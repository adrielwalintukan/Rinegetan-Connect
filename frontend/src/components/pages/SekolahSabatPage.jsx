/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import { Clock } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { CreationGrid, MainColumns, SabbathColumn } from "@/components/layout/CreationGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { SABBATH, SABBATH_SCHOOL_CLASSES, IMAGES } from "@/data/content";

const DAYS_ID = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabat (Sabtu)",
];

/**
 * @param {{ initialSchedules?: any[] | null, sectionMedia?: any, catalog?: any }} props
 */
export default function SekolahSabatPage({ initialSchedules = null, sectionMedia = null, catalog = null }) {
    const materials = catalog?.status === "available" && Array.isArray(catalog.classes) ? catalog.classes : [];
    const weekly = initialSchedules !== null
        ? initialSchedules.map((s) => ({
            day: s.day || (s.day_of_week !== undefined ? DAYS_ID[s.day_of_week] : "Sabat (Sabtu)"),
            name: s.name || s.title,
            time: s.time || (s.start_time ? `${s.start_time.slice(0, 5)} WITA` : "08.45 WITA"),
        }))
        : SABBATH.weekly;
    return (
        <section data-testid="sekolah-sabat-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading as="h1"
                    number="01"
                    eyebrow="Sekolah Sabat"
                    title={
                        <>
                            Kelas Alkitab untuk{" "}
                            <span className="font-serif italic text-sabbath-600">setiap usia</span>
                        </>
                    }
                    description="Sekolah Sabat adalah jantung pendalaman Alkitab gereja Advent — kelompok kecil yang hangat, setiap Sabtu pukul 08.45 WITA, sebelum ibadah utama."
                />

                <CreationGrid className="mt-12">
                    <MainColumns>
                        <section aria-labelledby="ss-local-title">
                            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-navy/15 pb-4">
                                <h2 id="ss-local-title" className="text-xl font-semibold text-navy">Bertumbuh bersama di gereja</h2>
                                <p className="text-sm text-sabbath-700">Setiap Sabtu · 08.45 WITA</p>
                            </div>
                        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                            {SABBATH_SCHOOL_CLASSES.map((kelas, i) => (
                                <Reveal key={kelas.name} delay={0.08 * i}>
                                    <article
                                        data-testid={`ss-class-${i}`}
                                        className="h-full rounded-[10px] border border-navy/10 bg-white p-5 sm:p-6"
                                    >
                                        <p className="text-sm font-medium text-sabbath-700">{kelas.age}</p>
                                        <h3 className="mt-2 text-xl font-semibold leading-snug text-navy">
                                            {kelas.name}
                                        </h3>
                                        <p className="mt-3 text-base leading-relaxed text-slate-600">
                                            {kelas.description}
                                        </p>
                                        <p className="mt-4 border-t border-navy/[0.07] pt-3 text-sm text-slate-600">Sabtu · {kelas.time}</p>
                                    </article>
                                </Reveal>
                            ))}
                        </div>
                        </section>

                        <section aria-labelledby="ss-materials-title" className="mt-10 border-y border-navy/15 py-7 sm:mt-12 sm:py-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sabbath-700">Belajar dalam Bahasa Indonesia</p>
                            <h2 id="ss-materials-title" className="mt-2 text-2xl font-semibold text-navy">Materi Sekolah Sabat</h2>
                            {materials.length > 0 ? (
                                <ul className="mt-5 divide-y divide-navy/10">
                                    {materials.map(({ classId, label, quarterly, period, sourceUrl, fetchedAt }) => (
                                        <li key={classId} className="min-w-0 break-words py-5 first:pt-0 last:pb-0">
                                            <h3 className="text-lg font-semibold text-navy">{label}</h3>
                                            <p className="mt-2 text-base leading-relaxed text-slate-700">{quarterly.title}</p>
                                            {period && <p className="mt-2 text-sm text-slate-600">{period} · {quarterly.lessons.length} pelajaran</p>}
                                            {quarterly.credits.map((credit, index) => (
                                                <p key={index} className="mt-2 text-sm leading-relaxed text-slate-600">{credit.name}: {credit.value}</p>
                                            ))}
                                            {sourceUrl === `https://sabbath-school.adventech.io/in/${quarterly.id}` && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-slate-600">Sumber: Adventech · Bahasa Indonesia</p>
                                                    <a href={`/sekolah-sabat/${quarterly.id}`} className="mt-3 flex min-h-11 items-center rounded-md font-semibold text-navy underline decoration-sabbath-400 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">Lihat pelajaran</a>
                                                    {fetchedAt && <p className="mt-1 text-xs text-slate-600">Diperbarui <time dateTime={fetchedAt}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(fetchedAt))} WITA</time></p>}
                                                    <a href={sourceUrl} className="mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-navy underline decoration-sabbath-400 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">Buka materi di Adventech</a>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="mt-5 max-w-xl border-l-2 border-sabbath-400 pl-4">
                                    <h3 className="text-base font-semibold text-navy">Materi belum tersedia</h3>
                                    <p className="mt-2 text-base leading-relaxed text-slate-600">Materi Bahasa Indonesia belum dapat dimuat dari sumber. Coba lagi nanti. Kelas di gereja tetap berlangsung setiap Sabtu.</p>
                                </div>
                            )}
                        </section>

                        <Reveal delay={0.15}>
                            <div
                                data-testid="ss-weekly-schedule"
                                className="card-surface mt-6 overflow-hidden"
                            >
                                <div className="border-b border-navy/[0.07] bg-navy-50/60 px-6 py-4">
                                    <h2 className="text-base font-semibold text-navy">
                                        Jadwal ibadah mingguan
                                    </h2>
                                </div>
                                {weekly.length > 0 ? (
                                    <ul className="divide-y divide-navy/[0.06]">
                                        {weekly.map((row, i) => (
                                            <li
                                                key={i}
                                                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 px-5 py-4 sm:px-6"
                                            >
                                                <span className="col-span-2 text-xs font-semibold uppercase tracking-[0.14em] text-sabbath-700">
                                                    {row.day}
                                                </span>
                                                <span className="min-w-0 break-words text-sm font-medium text-navy">
                                                    {row.name}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Clock
                                                        className="h-3.5 w-3.5 text-sabbath-600"
                                                        aria-hidden="true"
                                                    />
                                                    {row.time}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-6">
                                        <EmptyState
                                            icon={Clock}
                                            compact
                                            title="Belum Ada Jadwal Khusus"
                                            description="Jadwal ibadah mingguan sedang diperbarui. Ibadah Sabat rutin tetap berlangsung setiap Sabtu pukul 08.45 WITA."
                                            testId="schedules-empty"
                                        />
                                    </div>
                                )}
                            </div>
                        </Reveal>

                        <Reveal delay={0.2}>
                            <figure className="img-frame mt-6 aspect-[21/9]">
                                <img
                                    src={sectionMedia?.sekolah_sabat?.image_url || sectionMedia?.sekolah_sabat?.url || IMAGES.bibleStudy.src}
                                    alt={sectionMedia?.sekolah_sabat?.alt_text || IMAGES.bibleStudy.alt}
                                    loading="lazy"
                                    className={`h-full w-full ${
                                        sectionMedia?.sekolah_sabat?.object_position === "contain"
                                            ? "object-contain"
                                            : sectionMedia?.sekolah_sabat?.object_position === "bottom"
                                            ? "object-cover object-bottom"
                                            : sectionMedia?.sekolah_sabat?.object_position === "top"
                                            ? "object-cover object-top"
                                            : "object-cover object-center"
                                    }`}
                                />
                            </figure>
                        </Reveal>
                    </MainColumns>

                    <Reveal delay={0.1} className="lg:col-span-1">
                        <SabbathColumn label="Sekolah Sabat · 08.45 WITA">
                            <p className="hidden font-mono text-[0.6875rem] leading-relaxed text-sabbath-700 lg:block">
                                Empat kelas, satu Kitab, setiap Sabat pagi.
                            </p>
                        </SabbathColumn>
                    </Reveal>
                </CreationGrid>
            </div>
        </section>
    );
}
