/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import { ArrowRight, ArrowUpRight, BookOpen, Clock } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { SABBATH, IMAGES } from "@/data/content";

const DAYS_ID = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabat (Sabtu)",
];

const OBJECT_FIT = {
    contain: "object-contain",
    bottom: "object-cover object-bottom",
    top: "object-cover object-top",
};

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
    const media = sectionMedia?.sekolah_sabat;
    return (
        <section data-testid="sekolah-sabat-page" className="pb-20 sm:pb-28">
            <PageHero
                number="01"
                eyebrow="Sekolah Sabat"
                title={<>Kelas Alkitab untuk <Accent>setiap usia</Accent></>}
                description="Sekolah Sabat adalah jantung pendalaman Alkitab gereja Advent — kelompok kecil yang hangat, setiap Sabtu pukul 08.45 WITA, sebelum ibadah utama."
            >
                <a href="#materi" className="btn-sabbath group">
                    Lihat materi
                    <ArrowRight className="h-4 w-4 rotate-90 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
                </a>
            </PageHero>

            <div className="mx-auto grid w-full max-w-[96rem] gap-10 px-5 pt-4 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
                <section id="materi" aria-labelledby="ss-materials-title" className="scroll-mt-28 lg:col-span-8">
                    <p className="label-eyebrow">Belajar dalam Bahasa Indonesia</p>
                    <h2 id="ss-materials-title" className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                        Materi Sekolah Sabat
                    </h2>
                    {materials.length > 0 ? (
                        <ul className="mt-8 grid gap-5">
                            {materials.map(({ classId, label, quarterly, period, sourceUrl, fetchedAt }) => (
                                <li
                                    key={classId}
                                    className="min-w-0 break-words rounded-2xl border border-navy/[0.08] bg-white p-6 shadow-[0_24px_48px_-32px_rgba(7,27,48,0.35)] sm:p-8"
                                >
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <h3 className="rounded-full bg-sabbath-100 px-3.5 py-1 text-sm font-semibold text-sabbath-700">{label}</h3>
                                        {period && (
                                            <p className="font-mono text-xs text-slate-600">
                                                {period} · {quarterly.lessons.length} pelajaran
                                            </p>
                                        )}
                                    </div>
                                    <p className="mt-5 text-2xl font-semibold leading-snug tracking-tight text-navy sm:text-3xl">{quarterly.title}</p>
                                    {quarterly.credits.map((credit, index) => (
                                        <p key={index} className="mt-2 text-sm leading-relaxed text-slate-600">{credit.name}: {credit.value}</p>
                                    ))}
                                    {sourceUrl === `https://sabbath-school.adventech.io/in/${quarterly.id}` && (
                                        <div className="mt-7 border-t border-navy/[0.07] pt-6">
                                            <div className="flex flex-wrap gap-3">
                                                <a href={`/sekolah-sabat/${quarterly.id}`} className="btn-primary group">
                                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                                    Lihat pelajaran Sekolah Sabat
                                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                                                </a>
                                                <a href={sourceUrl} className="btn-secondary group">
                                                    Buka materi di Adventech
                                                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                                                </a>
                                            </div>
                                            <p className="mt-4 text-xs leading-relaxed text-slate-600">
                                                Sumber: Adventech · Bahasa Indonesia
                                                {fetchedAt && <> · Diperbarui <time dateTime={fetchedAt}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(fetchedAt))} WITA</time></>}
                                            </p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="mt-8 rounded-2xl border border-sabbath-500/30 bg-sabbath-50 p-6 sm:p-8">
                            <h3 className="text-lg font-semibold text-navy">Materi belum tersedia</h3>
                            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">Materi Bahasa Indonesia belum dapat dimuat dari sumber. Coba lagi nanti. Kelas di gereja tetap berlangsung setiap Sabtu.</p>
                        </div>
                    )}
                </section>

                <Reveal delay={0.1} className="lg:col-span-4">
                    <div
                        data-testid="ss-weekly-schedule"
                        className="relative isolate overflow-hidden rounded-2xl bg-navy-900 p-7 text-white shadow-[0_40px_80px_-40px_rgba(7,27,48,0.6)] sm:p-8 lg:sticky lg:top-28"
                    >
                        <svg aria-hidden="true" viewBox="0 0 400 400" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]">
                            <path d="M0 300C80 220 170 360 250 270S370 150 400 190" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M0 340C90 260 180 390 270 310S380 200 400 240" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-sabbath-300">Setiap minggu</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Jadwal ibadah mingguan</h2>
                        {weekly.length > 0 ? (
                            <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                                {weekly.map((row, i) => (
                                    <li key={i} className="py-4">
                                        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-sabbath-300">{row.day}</p>
                                        <div className="mt-1.5 flex items-baseline justify-between gap-3">
                                            <span className="min-w-0 break-words font-medium">{row.name}</span>
                                            <span className="flex shrink-0 items-center gap-1.5 font-mono text-sm text-sabbath-400">
                                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                                {row.time}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-6 rounded-xl bg-white p-1 text-navy">
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

                <Reveal delay={0.15} className="lg:col-span-12">
                    <figure className="m-0 aspect-[4/3] overflow-hidden rounded-2xl bg-navy-100 sm:aspect-[21/9]">
                        <img
                            src={media?.image_url || media?.url || IMAGES.bibleStudy.src}
                            alt={media?.alt_text || IMAGES.bibleStudy.alt}
                            loading="lazy"
                            className={`h-full w-full ${OBJECT_FIT[media?.object_position] || "object-cover object-center"}`}
                        />
                    </figure>
                </Reveal>
            </div>
        </section>
    );
}
