import { BookOpen, DoorOpen, ArrowRight } from "lucide-react";
import { HandsPraying } from "@/components/identity/extraIcons";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { MINISTRY_CARDS } from "@/data/content";

const MINISTRY_ICONS = {
    "book-open": BookOpen,
    "hands-praying": HandsPraying,
    "door-open": DoorOpen,
};

export const DigitalMinistrySection = () => (
    <section
        data-testid="digital-ministry-section"
        aria-labelledby="digital-ministry-heading"
        className="py-20 lg:py-28"
    >
        <div className="container-site">
            <ChapterHeading
                number="06"
                eyebrow="Pelayanan Digital"
                title={
                    <span id="digital-ministry-heading">
                        Pelayanan <span className="font-serif italic text-sabbath-600">Digital</span>
                    </span>
                }
                description="Rinegetan Connect sedang bertumbuh. Tiga pelayanan digital ini sedang kami siapkan untuk melayani Anda lebih dekat — pratinjau Fase 3."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
                {MINISTRY_CARDS.map((card, i) => {
                    const Icon = MINISTRY_ICONS[card.icon];
                    return (
                        <Reveal key={card.id} delay={0.1 * i}>
                            <article
                                data-testid={`ministry-card-${card.id}`}
                                className="card-surface group relative flex h-full flex-col overflow-hidden p-7"
                            >
                                <span className="absolute right-5 top-5 rounded-full bg-sabbath-100 px-3 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-sabbath-700">
                                    Segera · {card.phase}
                                </span>
                                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-sabbath-400">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <h3 className="mt-5 text-lg font-semibold text-navy">{card.title}</h3>
                                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600">
                                    {card.description}
                                </p>
                                <span className="mt-6 inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-navy-500">
                                    Nantikan di Fase 3
                                    <ArrowRight
                                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                                        aria-hidden="true"
                                    />
                                </span>
                            </article>
                        </Reveal>
                    );
                })}
            </div>
        </div>
    </section>
);
