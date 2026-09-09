import { Sunrise } from "lucide-react";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { CreationGrid, MainColumns, SabbathColumn } from "@/components/layout/CreationGrid";
import { SABBATH } from "@/data/content";

export const SabbathSection = () => (
    <section
        id="sabat"
        data-testid="sabbath-section"
        aria-labelledby="sabbath-heading"
        className="scroll-mt-24 bg-sabbath-50/70 py-20 lg:py-28"
    >
        <div className="container-site">
            <ChapterHeading
                number="01"
                eyebrow={`${SABBATH.verse} — ${SABBATH.verseRef}`}
                title={
                    <span id="sabbath-heading">
                        Hari <span className="font-serif italic text-sabbath-600">Sabat</span> — kami berkumpul
                    </span>
                }
                description="Sejak matahari terbenam Jumat hingga Sabtu senja, jemaat berhenti dari kesibukan dan pulang kepada Sang Pencipta. Inilah waktu kami berkumpul — dan kursi selalu tersedia untuk Anda."
            />
            <CreationGrid className="mt-12 lg:mt-16">
                <MainColumns className="grid gap-5 sm:grid-cols-2">
                    {SABBATH.items.map((item, i) => (
                        <Reveal key={item.name} delay={i * 0.12}>
                            <article
                                data-testid={`sabbath-schedule-${i === 0 ? "sekolah-sabat" : "ibadah-sabat"}`}
                                className="card-surface flex h-full flex-col p-7 lg:p-9"
                            >
                                <Sunrise className="h-6 w-6 text-sabbath-600" aria-hidden="true" />
                                <h3 className="mt-5 text-xl font-semibold text-navy sm:text-2xl">
                                    {item.name}
                                </h3>
                                <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-sabbath-600 sm:text-3xl">
                                    {item.time}
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                    {item.note}
                                </p>
                            </article>
                        </Reveal>
                    ))}
                </MainColumns>
                <Reveal delay={0.2} className="lg:col-span-1">
                    <SabbathColumn label="Sabat · Hari Ketujuh">
                        <p className="hidden font-mono text-[0.6875rem] leading-relaxed text-sabbath-700 lg:block">
                            Kolom ketujuh dari Creation Grid — ruang henti, sengaja dibiarkan
                            bernafas.
                        </p>
                    </SabbathColumn>
                </Reveal>
            </CreationGrid>
        </div>
    </section>
);
