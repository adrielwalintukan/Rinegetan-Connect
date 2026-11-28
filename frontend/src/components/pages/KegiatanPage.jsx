"use client";

import { useState } from "react";
import { CalendarX } from "lucide-react";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { EventCard } from "@/components/sections/EventsSection";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { EVENT_CATEGORIES } from "@/data/content";
import { cn } from "@/lib/utils";

/**
 * @param {{ initialEvents?: any[] | null }} props
 */
export default function KegiatanPage({ initialEvents = null }) {
    const allEvents = initialEvents ?? [];
    const [filter, setFilter] = useState("Semua");
    const visible =
        filter === "Semua" ? allEvents : allEvents.filter((e) => e.category === filter);

    return (
        <section data-testid="kegiatan-page" className="pb-20 sm:pb-28">
            <PageHero
                number="01"
                eyebrow="Kegiatan"
                title={<>Agenda <Accent>jemaat</Accent> Rinegetan</>}
                description="Ibadah, persekutuan pemuda, pelajaran Sekolah Sabat, dan pelayanan masyarakat — semua terbuka untuk dihadiri."
            />
            <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
                {allEvents.length > 0 && (
                    <div
                        role="group"
                        aria-label="Saring kegiatan berdasarkan kategori"
                        className="flex flex-wrap gap-2 border-b border-navy/10 pb-8"
                    >
                        {["Semua", ...EVENT_CATEGORIES].map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                data-testid={`event-filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                                aria-pressed={filter === cat}
                                onClick={() => setFilter(cat)}
                                className={cn(
                                    "min-h-11 rounded-full border px-5 py-2 text-[0.8125rem] font-semibold transition-[background-color,color,border-color] duration-200",
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
                    <div className="mt-4">
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

