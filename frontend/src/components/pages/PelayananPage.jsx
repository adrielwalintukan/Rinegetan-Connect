import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { DigitalMinistrySection } from "@/components/sections/DigitalMinistrySection";
import { Reveal } from "@/components/motion/Reveal";

/**
 * @param {{ initialDepartments?: any[] | null }} props
 */
export default function PelayananPage({ initialDepartments = null }) {
    return (
        <>
            <section data-testid="pelayanan-intro">
                <PageHero
                    number="01"
                    eyebrow="Pelayanan"
                    title={<>Setiap anggota, <Accent>seorang pelayan</Accent></>}
                    description="Di GMAHK Rinegetan, pelayanan bukan pekerjaan segelintir orang — ia adalah cara kami hidup. Temukan tempat Anda melayani, atau biarkan kami melayani Anda."
                />
                <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
                    <Reveal>
                        <div
                            id="alkitab"
                            data-testid="pelayanan-alkitab-note"
                            className="grid scroll-mt-32 gap-6 rounded-2xl border border-sabbath-500/30 bg-sabbath-50 p-7 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-10"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-sabbath-400">
                                <BookOpen className="h-6 w-6" aria-hidden="true" />
                            </span>
                            <p className="max-w-2xl text-base leading-relaxed text-navy-700">
                                <span className="block text-xl font-semibold tracking-tight text-navy">Ingin belajar Alkitab?</span>
                                Kami menyediakan pelajaran Alkitab pribadi maupun kelompok kecil — gratis, tanpa
                                tekanan, sesuai waktu Anda. Sampaikan kepada pengurus jemaat ketika Anda hadir pada
                                Sabtu pagi.
                            </p>
                            <Link prefetch={false} href="/pelajari-alkitab" className="btn-primary group justify-self-start">
                                Buka pelajaran Alkitab
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>
            <DepartmentsSection departments={initialDepartments} />
            <DigitalMinistrySection />
        </>
    );
}
