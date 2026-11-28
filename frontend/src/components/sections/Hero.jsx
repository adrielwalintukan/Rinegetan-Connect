"use client";

import Link from "next/link";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BookOpen } from "lucide-react";
import { KineticLines } from "@/components/motion/KineticLines";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { CHURCH, IMAGES, SABBATH } from "@/data/content";

// Below lg the photo is a 220%-wide band pinned to the bottom, shifted so the right part of the frame is centred,
// and its top fades into a blurred copy of the same photo: the sky is extended upward instead of cropping the building.
// shortcut: the -115% shift suits the current church photo (building on the right); add a focus option to the
// portal if a future photo needs another anchor.
const MOBILE_BAND =
    "bottom-0 left-[-115%] h-auto w-[220%] max-w-none [mask-image:linear-gradient(to_bottom,transparent,black_22%)] lg:bottom-auto lg:left-0 lg:top-0 lg:w-full lg:[mask-image:none]";
const OBJECT_POSITION = {
    contain: "inset-x-0 top-0 h-full w-full object-contain",
    bottom: `${MOBILE_BAND} lg:h-[112%] lg:object-cover lg:object-bottom will-change-transform`,
    top: `${MOBILE_BAND} lg:h-[112%] lg:object-cover lg:object-top will-change-transform`,
    center: `${MOBILE_BAND} lg:h-[112%] lg:object-cover lg:object-center will-change-transform`,
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
    const heroPosition = sectionMedia?.home_hero?.object_position || "center";

    return (
        <section
            data-testid="hero"
            className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-navy-900 text-white lg:justify-end"
        >
            {/* Mobile sky: the same photo blurred, behind the sharp band, so the extra height matches its colours. */}
            <img
                src={heroSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 -z-20 h-full w-full scale-125 object-cover object-top blur-2xl lg:hidden"
            />
            <motion.figure
                ref={frameRef}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 -z-10 m-0 overflow-hidden"
                data-testid="hero-image-frame"
            >
                <motion.img
                    src={heroSrc}
                    alt={heroAlt}
                    style={heroPosition === "contain" ? undefined : { y: imgY }}
                    // Scroll-linked parallax is not an animation, so skipAnimations cannot stop it; CSS can.
                    className={`absolute motion-reduce:![transform:none] ${
                        OBJECT_POSITION[heroPosition] || OBJECT_POSITION.center
                    }`}
                    fetchPriority="high"
                />
                {/* Mobile: darker top behind the text, a thin fade at the bottom. Desktop: two scrims for the text column. */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-navy-900/85 via-navy-900/40 via-40% to-transparent to-60% lg:hidden" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent to-20% lg:from-navy-900/95 lg:via-navy-900/50 lg:to-navy-900/25 lg:to-100%" />
                <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-navy-900/80 via-navy-900/25 to-transparent lg:block" />
            </motion.figure>

            <div className="relative w-full px-5 pb-6 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-24 xl:pt-44">
                <div className="max-w-3xl">
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="font-mono text-[0.6875rem] font-medium uppercase leading-relaxed tracking-[0.28em] text-white/75"
                    >
                        {CHURCH.fullName} — {CHURCH.entity}
                    </motion.p>

                    <h1
                        data-testid="hero-headline"
                        className="mt-6 text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.75rem]"
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
                    </motion.div>
                </div>
            </div>

            {/* Mobile: reserves room for the building below the text; on short screens the hero grows instead of covering it. */}
            <div aria-hidden="true" className="h-[40vw] shrink-0 lg:hidden" />

            {/* Creation Grid: the seventh-day column becomes a thin amber rail on the right edge. */}
            <motion.aside
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 1.1 }}
                data-testid="hero-sabbath-column"
                aria-label="Kolom Sabat"
                className="mt-auto flex items-center gap-4 px-5 py-3 sm:px-8 sm:py-4 lg:absolute lg:bottom-24 lg:right-12 lg:top-44 lg:flex-col lg:justify-between lg:border-l lg:border-t-0 lg:border-sabbath-400/60 lg:p-0 lg:pl-5"
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
