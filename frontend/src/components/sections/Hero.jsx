"use client";

import Link from "next/link";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, BookOpen } from "lucide-react";
import { KineticLines } from "@/components/motion/KineticLines";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { CHURCH, IMAGES, SABBATH } from "@/data/content";

const OBJECT_POSITION = {
    contain: "h-full object-contain",
    bottom: "h-[112%] object-cover object-bottom will-change-transform",
    top: "h-[112%] object-cover object-top will-change-transform",
    right: "h-[112%] object-cover object-[80%_center] will-change-transform",
};

export const Hero = ({ sectionMedia = null }) => {
    const frameRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: frameRef,
        offset: ["start start", "end start"],
    });
    const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);

    const heroSrc = sectionMedia?.home_hero?.image_url || sectionMedia?.home_hero?.url || IMAGES.hero.src;
    const heroAlt = sectionMedia?.home_hero?.alt_text || IMAGES.hero.alt;
    const heroCaption = sectionMedia?.home_hero?.caption || IMAGES.hero.caption;
    const heroPosition = sectionMedia?.home_hero?.object_position || (sectionMedia?.home_hero ? "center" : IMAGES.hero.position);

    return (
        <section
            data-testid="hero"
            className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-navy-900 text-white"
        >
            <motion.figure
                ref={frameRef}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 -z-10 m-0"
                data-testid="hero-image-frame"
            >
                <motion.img
                    src={heroSrc}
                    alt={heroAlt}
                    style={heroPosition === "contain" ? undefined : { y: imgY }}
                    // Scroll-linked parallax is not an animation, so skipAnimations cannot stop it; CSS can.
                    className={`absolute inset-x-0 top-0 w-full motion-reduce:![transform:none] ${
                        OBJECT_POSITION[heroPosition] || "h-[112%] object-cover object-center will-change-transform"
                    }`}
                    fetchPriority="high"
                />
                {/* Two scrims: bottom-up for mobile text, left-to-right for the desktop text column. */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-900/95 via-navy-900/50 to-navy-900/25" />
                <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-navy-900/80 via-navy-900/25 to-transparent lg:block" />
                <figcaption className="absolute bottom-8 right-5 hidden items-center gap-2 rounded-full bg-navy-900/60 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-md sm:flex lg:right-28">
                    <span className="h-1.5 w-1.5 rounded-full bg-sabbath-400" aria-hidden="true" />
                    {heroCaption}
                </figcaption>
            </motion.figure>

            <div className="w-full px-5 pb-14 pt-32 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24 xl:pt-44">
                <div className="max-w-3xl">
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-white/75"
                    >
                        {CHURCH.fullName} — {CHURCH.entity}
                    </motion.p>

                    <h1
                        data-testid="hero-headline"
                        className="mt-6 text-[2.5rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.75rem]"
                    >
                        <KineticLines
                            lines={[
                                <>Tempat Bertumbuh</>,
                                <>
                                    dalam <em className="font-serif font-medium italic text-sabbath-400">Iman</em>,
                                    Melayani,
                                </>,
                                <>
                                    dan{" "}
                                    <span className="relative inline-block">
                                        Bersama
                                        <motion.span
                                            aria-hidden="true"
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            transition={{ duration: 0.9, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute -bottom-1 left-0 h-[0.14em] w-full origin-left rounded-full bg-sabbath-500 lg:-bottom-2"
                                        />
                                    </span>
                                    .
                                </>
                            ]}
                        />
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-7 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
                    >
                        Selamat datang di keluarga {CHURCH.name} — jemaat Kristen Advent hari
                        ketujuh di {CHURCH.region}. Kami berkumpul setiap Sabat untuk beribadah,
                        belajar Alkitab, dan melayani masyarakat dengan kasih. Anda diundang, apa
                        pun latar belakang Anda.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.85 }}
                        className="mt-9 flex flex-wrap items-center gap-3"
                    >
                        <Link
                            prefetch={false} href="/sekolah-sabat"
                            data-testid="hero-cta-sekolah-sabat"
                            className="btn-sabbath group"
                        >
                            Pelajaran Sekolah Sabat
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <a
                            href="#sabat"
                            data-testid="hero-cta-jadwal-ibadah"
                            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                        >
                            Jadwal Ibadah
                            <ArrowDown
                                className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5"
                                aria-hidden="true"
                            />
                        </a>
                    </motion.div>
                </div>
            </div>

            {/* Creation Grid: the seventh-day column becomes a thin amber rail on the right edge. */}
            <motion.aside
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 1.1 }}
                data-testid="hero-sabbath-column"
                aria-label="Kolom Sabat"
                className="flex items-center gap-4 border-t border-white/15 px-5 py-4 sm:px-8 lg:absolute lg:bottom-24 lg:right-12 lg:top-44 lg:flex-col lg:justify-between lg:border-l lg:border-t-0 lg:border-sabbath-400/60 lg:p-0 lg:pl-5"
            >
                <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.26em] text-sabbath-300 lg:rotate-180 lg:[writing-mode:vertical-rl]">
                    Sabat · Jumat matahari terbenam sampai Sabtu matahari terbenam
                </span>
                <span className="ml-auto flex items-center gap-3 lg:ml-0 lg:flex-col">
                    {/* The church symbol keeps its original amber; logos are exempt from text contrast. */}
                    <span className="text-[#C98F26]">
                        <AdventistSymbol className="h-8 w-8 lg:h-10 lg:w-10" />
                    </span>
                    <span className="font-mono text-xs text-white/75">{SABBATH.items[0].time}</span>
                </span>
            </motion.aside>
        </section>
    );
};
