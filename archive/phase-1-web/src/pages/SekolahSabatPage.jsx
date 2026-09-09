import { BookOpen, Clock } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { CreationGrid, MainColumns, SabbathColumn } from "@/components/layout/CreationGrid";
import { SABBATH, SABBATH_SCHOOL_CLASSES, IMAGES } from "@/data/content";

export default function SekolahSabatPage() {
    return (
        <section data-testid="sekolah-sabat-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            {SABBATH_SCHOOL_CLASSES.map((kelas, i) => (
                                <Reveal key={kelas.name} delay={0.08 * i}>
                                    <article
                                        data-testid={`ss-class-${i}`}
                                        className="card-surface h-full p-6"
                                    >
                                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-sabbath-400">
                                            <BookOpen className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h2 className="mt-4 text-lg font-semibold text-navy">
                                            {kelas.name}
                                        </h2>
                                        <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-sabbath-700">
                                            {kelas.age} · {kelas.time}
                                        </p>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                            {kelas.description}
                                        </p>
                                    </article>
                                </Reveal>
                            ))}
                        </div>

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
                                <ul className="divide-y divide-navy/[0.06]">
                                    {SABBATH.weekly.map((row, i) => (
                                        <li
                                            key={i}
                                            className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4"
                                        >
                                            <span className="font-mono text-xs uppercase tracking-[0.14em] text-sabbath-700">
                                                {row.day}
                                            </span>
                                            <span className="flex-1 px-3 text-sm font-medium text-navy">
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
                            </div>
                        </Reveal>

                        <Reveal delay={0.2}>
                            <figure className="img-frame mt-6 aspect-[21/9]">
                                <img
                                    src={IMAGES.bibleStudy.src}
                                    alt={IMAGES.bibleStudy.alt}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
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
