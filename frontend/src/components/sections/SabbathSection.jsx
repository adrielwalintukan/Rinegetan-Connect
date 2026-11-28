import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SABBATH } from "@/data/content";

export const SabbathSection = () => (
    <section
        id="sabat"
        data-testid="sabbath-section"
        aria-labelledby="sabbath-heading"
        className="scroll-mt-24 bg-background py-20 sm:py-28 lg:py-36"
    >
        <div className="mx-auto grid w-full max-w-[96rem] gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-12">
            <Reveal className="lg:col-span-6">
                <p className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-medium text-sabbath-600" aria-hidden="true">01</span>
                    <span className="label-eyebrow">Hari Sabat</span>
                </p>
                <h2
                    id="sabbath-heading"
                    className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-6xl"
                >
                    Hari <span className="font-serif italic text-sabbath-600">Sabat</span> —{" "}
                    <br className="hidden sm:block" />
                    kami berkumpul
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    Sejak matahari terbenam Jumat hingga Sabtu senja, jemaat berhenti dari kesibukan dan pulang
                    kepada Sang Pencipta. Inilah waktu kami berkumpul — dan kursi selalu tersedia untuk Anda.
                </p>
                <figure className="mt-10 border-l-2 border-sabbath-500 pl-6">
                    <blockquote className="font-serif text-2xl italic leading-snug text-navy sm:text-3xl">
                        “{SABBATH.verse}.”
                    </blockquote>
                    <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.24em] text-sabbath-700">
                        {SABBATH.verseRef}
                    </figcaption>
                </figure>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-6">
                <div className="relative isolate overflow-hidden rounded-2xl bg-navy-900 p-7 text-white shadow-[0_40px_80px_-40px_rgba(7,27,48,0.6)] sm:p-10 lg:p-12">
                    {/* Same flowing lines as the action-card section, so the two navy surfaces read as one system. */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 600 400"
                        preserveAspectRatio="none"
                        className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]"
                    >
                        <path d="M0 300C120 220 260 360 380 270S560 150 600 190" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M0 340C130 260 270 390 400 310S570 200 600 240" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-sabbath-300">
                        Setiap Sabtu
                    </p>
                    <ol className="mt-6 divide-y divide-white/10 border-y border-white/10">
                        {SABBATH.items.map((item, i) => (
                            <li
                                key={item.name}
                                data-testid={`sabbath-schedule-${i === 0 ? "sekolah-sabat" : "ibadah-sabat"}`}
                                className="grid grid-cols-[2.25rem_1fr] gap-x-3 py-7 sm:grid-cols-[3rem_1fr]"
                            >
                                <span className="pt-2 font-mono text-xs text-sabbath-400" aria-hidden="true">
                                    0{i + 1}
                                </span>
                                <div>
                                    <p className="font-mono text-2xl font-semibold tracking-tight text-sabbath-400 sm:text-3xl">
                                        {item.time}
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold sm:text-2xl">{item.name}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.note}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <Link href="/kontak#berkunjung" data-testid="sabbath-cta-berkunjung" className="btn-sabbath group mt-8">
                        Rencanakan kunjungan
                        <ArrowUpRight
                            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            </Reveal>
        </div>
    </section>
);
