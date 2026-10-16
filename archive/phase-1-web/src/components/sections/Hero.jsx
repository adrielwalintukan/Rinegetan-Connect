import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { KineticLines } from "@/components/motion/KineticLines";
import { GridGuides } from "@/components/layout/CreationGrid";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { CHURCH, IMAGES, SABBATH } from "@/data/content";

export const Hero = () => {
    const frameRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: frameRef,
        offset: ["start end", "end start"],
    });
    const imgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

    return (
        <section data-testid="hero" className="relative overflow-hidden">
            <GridGuides />
            <div className="container-site relative grid grid-cols-1 gap-10 pb-14 pt-14 sm:pt-20 lg:grid-cols-7 lg:gap-0 lg:pb-20 lg:pt-24">
                <div className="lg:col-span-6 lg:pr-14">
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.05 }}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-sabbath-400">
                            <AdventistSymbol className="h-4 w-4" />
                        </span>
                        <span className="label-eyebrow">
                            {CHURCH.fullName} — {CHURCH.entity}
                        </span>
                    </motion.p>

                    <h1
                        data-testid="hero-headline"
                        className="mt-7 text-4xl font-extrabold leading-[1.04] tracking-tight text-navy sm:text-5xl lg:text-[4.35rem]"
                    >
                        <KineticLines
                            lines={[
                                <>Tempat Bertumbuh</>,
                                <>
                                    dalam <em className="font-serif font-medium italic">Iman</em>,
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
                                </>,
                            ]}
                        />
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-7 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
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
                        <a href="#sabat" data-testid="hero-cta-jadwal-ibadah" className="btn-primary">
                            Jadwal Ibadah
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <a
                            href="/pelayanan#alkitab"
                            data-testid="hero-cta-pelajari-alkitab"
                            className="btn-secondary group"
                        >
                            Pelajari Alkitab
                            <ArrowUpRight
                                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                aria-hidden="true"
                            />
                        </a>
                    </motion.div>

                    <motion.div
                        ref={frameRef}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="img-frame relative mt-12 aspect-[16/8] shadow-[0_40px_80px_-40px_rgba(10,37,64,0.4)]"
                        data-testid="hero-image-frame"
                    >
                        <motion.img
                            src={IMAGES.hero.src}
                            alt={IMAGES.hero.alt}
                            style={{ y: imgY }}
                            className="h-[122%] w-full -translate-y-[8%] object-cover will-change-transform"
                            fetchPriority="high"
                        />
                        <figcaption className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-navy/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-sabbath-400" aria-hidden="true" />
                            {IMAGES.hero.caption}
                        </figcaption>
                    </motion.div>
                </div>

                <motion.aside
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    data-testid="hero-sabbath-column"
                    aria-label="Kolom Sabat"
                    className="flex flex-row items-center justify-between gap-5 rounded-xl border border-sabbath-500/30 bg-sabbath-100/70 p-5 lg:col-span-1 lg:min-h-[32rem] lg:flex-col lg:items-start lg:justify-between lg:border-y-0 lg:border-l lg:border-r-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:pl-8"
                >
                    <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-sabbath-700 lg:[writing-mode:vertical-rl] lg:rotate-180">
                        Kolom Ketujuh — {SABBATH.title}
                    </span>
                    <div className="text-sabbath-600 lg:self-end">
                        <AdventistSymbol className="h-12 w-12 lg:h-16 lg:w-16" />
                    </div>
                    <div className="hidden lg:block">
                        <p className="font-serif text-lg italic text-navy">Sabtu</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                            {SABBATH.items[0].time}
                        </p>
                    </div>
                </motion.aside>
            </div>
        </section>
    );
};
