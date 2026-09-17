"use client";

import { useState } from "react";
import { CalendarX } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { EventCard } from "@/components/sections/EventsSection";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { EVENTS, EVENT_CATEGORIES } from "@/data/content";
import { cn } from "@/lib/utils";

export default function KegiatanPage({ initialEvents = null }) {
    const allEvents = initialEvents !== null ? initialEvents : EVENTS;
    const [filter, setFilter] = useState("Semua");
    const visible =
        filter === "Semua" ? allEvents : allEvents.filter((e) => e.category === filter);

    return (
        <section data-testid="kegiatan-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading
                    number="01"
                    eyebrow="Kegiatan"
                    title={
                        <>
                            Agenda{" "}
                            <span className="font-serif italic text-sabbath-600">jemaat</span>{" "}
                            Rinegetan
                        </>
                    }
                    description="Ibadah, persekutuan pemuda, pelajaran Sekolah Sabat, dan pelayanan masyarakat — semua terbuka untuk dihadiri."
                />

                {allEvents.length > 0 && (
                    <div
                        role="group"
                        aria-label="Saring kegiatan berdasarkan kategori"
                        className="mt-10 flex flex-wrap gap-2"
                    >
                        {["Semua", ...EVENT_CATEGORIES].map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                data-testid={`event-filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                                aria-pressed={filter === cat}
                                onClick={() => setFilter(cat)}
                                className={cn(
                                    "rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-[background-color,color,border-color] duration-200",
                                    filter === cat
                                        ? "border-navy bg-navy text-white"
                                        : "border-navy/15 bg-white text-slate-600 hover:border-navy/40 hover:text-navy"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {visible.length > 0 ? (
                    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {visible.map((event, i) => (
                            <Reveal key={event.id} delay={0.06 * i}>
                                <EventCard event={event} />
                            </Reveal>
                        ))}
                    </div>
                ) : allEvents.length === 0 ? (
                    <div className="mt-12">
                        <EmptyState
                            icon={CalendarX}
                            title="Belum Ada Kegiatan Mendatang"
                            description="Saat ini belum ada agenda kegiatan jemaat yang dijadwalkan. Silakan kunjungi kembali nanti atau hubungi kami untuk informasi lebih lanjut."
                            actionLabel="Hubungi Kami"
                            actionHref="/kontak"
                            testId="events-empty"
                        />
                    </div>
                ) : (
                    <div className="mt-12">
                        <EmptyState
                            icon={CalendarX}
                            compact
                            title={`Belum Ada Kegiatan pada Kategori "${filter}"`}
                            description="Silakan pilih kategori lain untuk melihat agenda kegiatan jemaat yang tersedia."
                            testId="events-empty"
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

