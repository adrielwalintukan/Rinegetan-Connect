import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GridGuides } from "@/components/layout/CreationGrid";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";

export const VisitCTA = () => (
    <section
        data-testid="visit-cta"
        aria-labelledby="visit-cta-heading"
        className="relative overflow-hidden border-t border-navy/[0.07] py-20 lg:py-28"
    >
        <GridGuides />
        <div className="container-site relative grid grid-cols-1 gap-10 lg:grid-cols-7">
            <Reveal className="lg:col-span-6">
                <p className="label-eyebrow">Anda diundang</p>
                <h2
                    id="visit-cta-heading"
                    className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl"
                >
                    Sabtu ini, datang dan{" "}
                    <span className="font-serif italic text-sabbath-600">beristirahatlah</span>{" "}
                    bersama kami.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                    Tidak perlu mendaftar, tidak perlu membawa apa-apa. Pintu kami terbuka sejak
                    pukul 08.30 WITA — tim penyambut akan menemani Anda sejak langkah pertama.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                    <Link
                        href="/kontak#berkunjung"
                        data-testid="visit-cta-button"
                        className="btn-primary group"
                    >
                        Saya Ingin Berkunjung
                        <ArrowUpRight
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                    <Link href="/sekolah-sabat" data-testid="visit-cta-ss" className="btn-secondary">
                        Tentang Sekolah Sabat
                    </Link>
                </div>
            </Reveal>
            <Reveal delay={0.2} className="hidden lg:col-span-1 lg:flex lg:items-end lg:justify-end">
                <span className="text-sabbath-500/80">
                    <AdventistSymbol className="h-20 w-20" />
                </span>
            </Reveal>
        </div>
    </section>
);
