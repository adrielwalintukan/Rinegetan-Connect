/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarX, Clock, MapPin } from "lucide-react";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";

export const EventCard = ({ event, featured = false }) => {
    const hasImage = Boolean(event.image_url || event.image);
    const dateText = event.start_date || event.date;
    const timeText = event.start_time || event.time;
    const locationText = event.location || event.venue;
    const descText = event.summary || event.description || event.body;

    return (
        <article
            data-testid={`event-card-${event.id}`}
            className="card-surface group flex h-full flex-col overflow-hidden"
        >
            {hasImage ? (
                <div className="img-frame relative aspect-[16/9] rounded-b-none border-0">
                    <img
                        src={event.image_url || event.image}
                        alt={`Foto kegiatan: ${event.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    {event.category && (
                        <span className="chip absolute left-4 top-4 !bg-white/95 shadow-sm">
                            {event.category}
                        </span>
                    )}
                </div>
            ) : event.category ? (
                <div className="px-6 pt-5">
                    <span className="chip !bg-slate-100 text-slate-700">
                        {event.category}
                    </span>
                </div>
            ) : null}
            <div className="flex flex-1 flex-col p-6">
                {dateText && (
                    <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-sabbath-700">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {dateText}
                    </p>
                )}
                <h3
                    className={`font-semibold tracking-tight text-navy ${dateText ? "mt-3" : ""} ${
                        featured ? "text-xl sm:text-2xl" : "text-lg"
                    }`}
                >
                    {event.title}
                </h3>
                {descText && (
                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">
                        {descText}
                    </p>
                )}
                {(timeText || locationText) && (
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-navy/[0.07] pt-4 text-xs text-slate-500">
                        {timeText && (
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-sabbath-600" aria-hidden="true" />
                                {timeText}
                            </span>
                        )}
                        {locationText && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-sabbath-600" aria-hidden="true" />
                                {locationText}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
};

export const EventsSection = ({ events = null }) => {
    const displayEvents = events ?? [];

    return (
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

                {displayEvents.length > 0 ? (
                    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayEvents.slice(0, 3).map((event, i) => (
                            <Reveal key={event.id} delay={0.1 * i}>
                                <EventCard event={event} />
                            </Reveal>
                        ))}
                    </div>
                ) : (
                    <div className="mt-12">
                        <EmptyState
                            icon={CalendarX}
                            title="Belum Ada Kegiatan Mendatang"
                            description="Saat ini belum ada agenda kegiatan baru yang dijadwalkan. Silakan kunjungi kembali nanti atau hadiri jadwal ibadah rutin."
                            actionLabel="Lihat Jadwal Ibadah"
                            actionHref="/sekolah-sabat"
                            testId="events-empty-state"
                        />
                    </div>
                )}
            </div>
        </section>
    );
};

