import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin } from "lucide-react";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { EVENTS } from "@/data/content";

export const EventCard = ({ event, featured = false }) => (
    <article
        data-testid={`event-card-${event.id}`}
        className="card-surface group flex h-full flex-col overflow-hidden"
    >
        <div className="img-frame relative aspect-[16/9] rounded-b-none border-0">
            <img
                src={event.image}
                alt={`Foto kegiatan: ${event.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <span className="chip absolute left-4 top-4 !bg-white/95 shadow-sm">
                {event.category}
            </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
            <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-sabbath-700">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {event.date}
            </p>
            <h3
                className={`mt-3 font-semibold tracking-tight text-navy ${
                    featured ? "text-xl sm:text-2xl" : "text-lg"
                }`}
            >
                {event.title}
            </h3>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600">
                {event.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-navy/[0.07] pt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sabbath-600" aria-hidden="true" />
                    {event.time}
                </span>
                <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sabbath-600" aria-hidden="true" />
                    {event.location}
                </span>
            </div>
        </div>
    </article>
);

export const EventsSection = () => (
    <section
        data-testid="events-section"
        aria-labelledby="events-heading"
        className="bg-navy-50/50 py-20 lg:py-28"
    >
        <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <ChapterHeading
                    number="03"
                    eyebrow="Kegiatan Jemaat"
                    title={<span id="events-heading">Kegiatan yang akan datang</span>}
                    description="Dari ibadah Sabat hingga bakti sosial desa — ada ruang untuk Anda ambil bagian."
                />
                <Reveal delay={0.1}>
                    <Link
                        href="/kegiatan"
                        data-testid="events-view-all"
                        className="btn-secondary group !px-6 !py-3 text-[0.8125rem]"
                    >
                        Semua Kegiatan
                        <ArrowUpRight
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                </Reveal>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {EVENTS.slice(0, 3).map((event, i) => (
                    <Reveal key={event.id} delay={0.1 * i}>
                        <EventCard event={event} />
                    </Reveal>
                ))}
            </div>
        </div>
    </section>
);
