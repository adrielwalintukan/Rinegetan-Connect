import Link from "next/link";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { DigitalMinistrySection } from "@/components/sections/DigitalMinistrySection";
import { Reveal } from "@/components/motion/Reveal";

/**
 * @param {{ initialDepartments?: any[] | null }} props
 */
export default function PelayananPage({ initialDepartments = null }) {
    return (
        <>
            <section data-testid="pelayanan-intro" className="py-16 lg:py-24 lg:pb-8">
                <div className="container-site">
                    <ChapterHeading as="h1"
                        number="01"
                        eyebrow="Pelayanan"
                        title={
                            <>
                                Setiap anggota,{" "}
                                <span className="font-serif italic text-sabbath-600">
                                    seorang pelayan
                                </span>
                            </>
                        }
                        description="Di GMAHK Rinegetan, pelayanan bukan pekerjaan segelintir orang — ia adalah cara kami hidup. Temukan tempat Anda melayani, atau biarkan kami melayani Anda."
                    />
                    <Reveal delay={0.1}>
                        <p
                            id="alkitab"
                            data-testid="pelayanan-alkitab-note"
                            className="mt-8 max-w-2xl scroll-mt-32 rounded-xl border border-sabbath-500/30 bg-sabbath-50 p-5 text-sm leading-relaxed text-navy-700"
                        >
                            <span className="font-semibold text-navy">
                                Ingin belajar Alkitab?
                            </span>{" "}
                            Kami menyediakan pelajaran Alkitab pribadi maupun kelompok kecil —
                            gratis, tanpa tekanan, sesuai waktu Anda. Sampaikan kepada pengurus
                            jemaat ketika Anda hadir pada Sabtu pagi.
                            <Link prefetch={false} href="/pelajari-alkitab" className="mt-3 flex min-h-11 items-center font-semibold underline underline-offset-4">Buka pelajaran Alkitab</Link>
                        </p>
                    </Reveal>
                </div>
            </section>
            <DepartmentsSection departments={initialDepartments} />
            <DigitalMinistrySection />
        </>
    );
}
