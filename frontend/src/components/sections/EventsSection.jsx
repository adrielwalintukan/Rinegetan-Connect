/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarX, Clock, MapPin } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export const EventCard = ({ event, featured = false }) => {
    const hasImage = Boolean(event.image_url || event.image);
    const dateText = event.start_date || event.date;
    const timeText = event.start_time || event.time;
    const locationText = event.location || event.venue;
    const descText = event.summary || event.description || event.body;

    return (
        <article
            data-testid={`event-card-${event.id}`}
            className="card-surface group flex h-full flex-col overflow-hidden rounded-2xl"
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
            className="bg-navy-50/60 py-20 sm:py-28 lg:py-32"
        >
            <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
                <div className="flex flex-wrap items-end justify-between gap-6 border-b border-navy/10 pb-10">
                    <Reveal className="max-w-3xl">
                        <p className="flex items-baseline gap-3">
                            <span className="font-mono text-xs font-medium text-sabbath-600" aria-hidden="true">02</span>
                            <span className="label-eyebrow">Kegiatan Jemaat</span>
                        </p>
                        <h2
                            id="events-heading"
                            className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-6xl"
                        >
                            Kegiatan yang akan <span className="font-serif italic text-sabbath-600">datang</span>
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                            Dari ibadah Sabat hingga bakti sosial desa — ada ruang untuk Anda ambil bagian.
                        </p>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <Link
                            href="/kegiatan"
                            data-testid="events-view-all"
                            className="btn-secondary group"
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
                    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayEvents.slice(0, 3).map((event, i) => (
                            <Reveal key={event.id} delay={0.1 * i}>
                                <EventCard event={event} />
                            </Reveal>
                        ))}
                    </div>
                ) : (
                    <Reveal className="mt-10">
                        <div
                            data-testid="events-empty-state"
                            className="grid gap-6 rounded-2xl border border-navy/[0.08] bg-white p-7 sm:p-10 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-10 lg:p-12"
                        >
                            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-sabbath-400">
                                <CalendarX className="h-7 w-7" aria-hidden="true" />
                            </span>
                            <div>
                                <h3 className="text-2xl font-semibold tracking-tight text-navy">
                                    Belum ada kegiatan mendatang
                                </h3>
                                <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
                                    Saat ini belum ada agenda kegiatan baru yang dijadwalkan. Silakan kunjungi kembali
                                    nanti atau hadiri jadwal ibadah rutin.
                                </p>
                            </div>
                            <Link
                                href="/sekolah-sabat"
                                prefetch={false}
                                data-testid="events-empty-state-action"
                                className="btn-primary group justify-self-start"
                            >
                                Lihat Jadwal Ibadah
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                    </Reveal>
                )}
            </div>
        </section>
    );
};

