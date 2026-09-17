import {
    BookOpen,
    Compass,
    Flame,
    HeartHandshake,
    HeartPulse,
    Megaphone,
    Music,
    Smile,
    Sun,
} from "lucide-react";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEPARTMENTS } from "@/data/content";

export const DEPT_ICONS = {
    "book-open": BookOpen,
    flame: Flame,
    compass: Compass,
    sun: Sun,
    smile: Smile,
    "heart-handshake": HeartHandshake,
    "heart-pulse": HeartPulse,
    music: Music,
    megaphone: Megaphone,
};

export const DepartmentsSection = ({ departments = null }) => {
    const list = departments !== null ? departments : DEPARTMENTS;

    return (
        <section
            data-testid="departments-section"
            aria-labelledby="departments-heading"
            className="py-20 lg:py-28"
        >
            <div className="container-site">
                <ChapterHeading
                    number="04"
                    eyebrow="Pelayanan Jemaat"
                    title={<span id="departments-heading">Departemen & pelayanan</span>}
                    description="Sembilan pelayanan, satu tujuan: membangun jemaat dan melayani sesama. Setiap anggota punya tempat untuk bertumbuh dan berkontribusi."
                />

                {list.length > 0 ? (
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((dept, i) => {
                            const Icon = (dept.icon && DEPT_ICONS[dept.icon]) || HeartHandshake;
                            return (
                                <Reveal key={dept.slug} delay={0.06 * i}>
                                    <article
                                        data-testid={`dept-card-${dept.slug}`}
                                        className="card-surface group flex h-full flex-col p-6"
                                    >
                                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sabbath-100 text-sabbath-700 transition-colors duration-300 group-hover:bg-navy group-hover:text-sabbath-400">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="mt-4 text-base font-semibold text-navy">
                                            {dept.name}
                                        </h3>
                                        <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-600">
                                            {dept.description}
                                        </p>
                                    </article>
                                </Reveal>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-12">
                        <EmptyState
                            icon={HeartHandshake}
                            title="Belum Ada Departemen Ditampilkan"
                            description="Informasi departemen dan bidang pelayanan jemaat sedang diperbarui. Hubungi kami untuk informasi pelayanan."
                            actionLabel="Hubungi Kami"
                            actionHref="/kontak"
                            testId="departments-empty"
                        />
                    </div>
                )}
            </div>
        </section>
    );
};
