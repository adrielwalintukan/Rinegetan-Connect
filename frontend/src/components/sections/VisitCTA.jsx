/* eslint-disable @next/next/no-img-element -- Phase 1 keeps static fallback images. */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { IMAGES, SABBATH } from "@/data/content";

// Restates only what the copy below already says; no new church facts.
const FACTS = ["Tanpa pendaftaran", "Terbuka untuk umum", `Sekolah Sabat ${SABBATH.items[0].time}`];

export const VisitCTA = () => (
    <section
        data-testid="visit-cta"
        aria-labelledby="visit-cta-heading"
        className="bg-background pb-20 pt-12 sm:pb-28 sm:pt-16 lg:pb-32"
    >
        <div className="mx-auto grid w-full max-w-[96rem] items-center gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12">
            <Reveal className="lg:col-span-6">
                <p className="label-eyebrow">Anda diundang</p>
                <h2
                    id="visit-cta-heading"
                    className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-6xl"
                >
                    Sabtu ini, datang dan{" "}
                    <span className="font-serif italic text-sabbath-600">beristirahatlah</span> bersama kami.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    Tidak perlu mendaftar. Ibadah terbuka untuk umum, dan Sekolah Sabat dimulai pukul{" "}
                    {SABBATH.items[0].time}.
                </p>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-y border-navy/10 py-5">
                    {FACTS.map((fact) => (
                        <li key={fact} className="flex items-center gap-2.5 text-sm font-medium text-navy">
                            <span className="h-1.5 w-1.5 rounded-full bg-sabbath-500" aria-hidden="true" />
                            {fact}
                        </li>
                    ))}
                </ul>
                <div className="mt-9 flex flex-wrap gap-3">
                    <Link href="/kontak#berkunjung" data-testid="visit-cta-button" className="btn-primary group">
                        Saya Ingin Berkunjung
                        <ArrowUpRight
                            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                    <Link href="/sekolah-sabat" prefetch={false} data-testid="visit-cta-ss" className="btn-secondary">
                        Tentang Sekolah Sabat
                    </Link>
                </div>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-6">
                <figure className="group relative m-0 aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_40px_80px_-40px_rgba(7,27,48,0.45)] lg:aspect-[5/4]">
                    <img
                        src={IMAGES.hero.src}
                        alt={IMAGES.hero.alt}
                        loading="lazy"
                        className="h-full w-full object-cover object-[78%_center] transition-transform duration-[1.2s] ease-out group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-900/55 via-transparent to-transparent" />
                    <figcaption className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-white/95 py-2 pl-2 pr-4 text-xs font-semibold text-navy shadow-sm sm:bottom-6 sm:left-6">
                        {/* The church symbol keeps its original amber; logos are exempt from text contrast. */}
                        <span className="text-[#C98F26]">
                            <AdventistSymbol className="h-6 w-6" />
                        </span>
                        Setiap Sabtu · {SABBATH.items[0].name} {SABBATH.items[0].time}
                    </figcaption>
                </figure>
            </Reveal>
        </div>
    </section>
);
