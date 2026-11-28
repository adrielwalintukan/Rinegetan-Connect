/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { MINISTRY_CARDS } from "@/data/content";
import { cn } from "@/lib/utils";

// Page-coloured wave that carves the navy section's top or bottom edge.
const WaveEdge = ({ position }) => (
    <svg
        aria-hidden="true"
        data-testid="wave-edge"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={cn(
            "pointer-events-none absolute inset-x-0 h-14 w-full text-background sm:h-20 lg:h-28",
            position === "top" ? "top-0" : "bottom-0 rotate-180"
        )}
    >
        <path fill="currentColor" d="M0 0h1440v38c-182 52-396 78-640 46C548 50 330 14 0 64z" />
    </svg>
);

export const DigitalMinistrySection = () => (
    <section
        data-testid="digital-ministry-section"
        aria-labelledby="digital-ministry-heading"
        className="relative isolate overflow-hidden bg-navy-900 py-28 text-white sm:py-36 lg:py-44"
    >
        {/* Soft flowing light behind the cards, in navy tones only. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute -left-1/4 top-1/3 h-[38rem] w-[70rem] -rotate-12 rounded-[50%] bg-navy-500/50 blur-3xl" />
            <div className="absolute -right-1/4 bottom-0 h-[30rem] w-[60rem] rotate-6 rounded-[50%] bg-navy-400/25 blur-3xl" />
            <svg viewBox="0 0 1440 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-white/[0.06]">
                <path d="M0 420C240 300 520 520 760 380S1200 160 1440 260" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M0 470C260 350 540 560 780 430S1210 220 1440 320" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M0 520C280 410 560 600 800 480S1220 280 1440 380" fill="none" stroke="currentColor" />
            </svg>
        </div>
        <WaveEdge position="top" />

        <div className="relative w-full px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-sabbath-300">
                    Pelayanan Digital
                </p>
                <h2 id="digital-ministry-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    Kami ada untuk <span className="font-serif italic text-sabbath-400">Anda</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/75">
                    Baca pelajaran Alkitab, kirim permohonan doa, atau beri tahu kami rencana kunjungan Anda.
                </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-[96rem] gap-5 md:grid-cols-3 lg:gap-6">
                {MINISTRY_CARDS.map((card, i) => (
                    <Reveal key={card.id} delay={0.12 * i}>
                        <article
                            data-testid={`ministry-card-${card.id}`}
                            className="group relative isolate flex min-h-[28rem] flex-col items-center justify-end overflow-hidden rounded-2xl p-7 text-center shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] sm:p-9 lg:min-h-[36rem]"
                        >
                            <img
                                src={card.image.src}
                                alt={card.image.alt}
                                loading="lazy"
                                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105 motion-reduce:transition-none"
                            />
                            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/95 via-navy-900/65 to-navy-900/20" />
                            <h3 className="text-3xl font-bold tracking-tight lg:text-4xl">{card.title}</h3>
                            <p className="mt-3 max-w-sm text-base leading-relaxed text-white/85">{card.description}</p>
                            <Link prefetch={false} href={card.href} className="btn-sabbath group/cta mt-7 min-h-11">
                                {card.cta}
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        </article>
                    </Reveal>
                ))}
            </div>
        </div>

        <WaveEdge position="bottom" />
    </section>
);
