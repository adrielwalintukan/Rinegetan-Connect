"use client";

import { useState } from "react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { EventCard } from "@/components/sections/EventsSection";
import { Reveal } from "@/components/motion/Reveal";
import { EVENTS, EVENT_CATEGORIES } from "@/data/content";
import { cn } from "@/lib/utils";

export default function KegiatanPage() {
    const [filter, setFilter] = useState("Semua");
    const visible =
        filter === "Semua" ? EVENTS : EVENTS.filter((e) => e.category === filter);

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

                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {visible.map((event, i) => (
                        <Reveal key={event.id} delay={0.06 * i}>
                            <EventCard event={event} />
                        </Reveal>
                    ))}
                </div>

                {visible.length === 0 && (
                    <p data-testid="events-empty" className="mt-10 text-sm text-slate-500">
                        Belum ada kegiatan pada kategori ini.
                    </p>
                )}
            </div>
        </section>
    );
}
