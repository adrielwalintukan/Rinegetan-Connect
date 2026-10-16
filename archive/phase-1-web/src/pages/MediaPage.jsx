import { useState } from "react";
import { Play } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { MEDIA_ITEMS } from "@/data/content";
import { cn } from "@/lib/utils";

const TYPES = ["Semua", "Khotbah", "Renungan", "Foto", "Video", "Materi"];

export default function MediaPage() {
    const [filter, setFilter] = useState("Semua");
    const visible =
        filter === "Semua" ? MEDIA_ITEMS : MEDIA_ITEMS.filter((m) => m.type === filter);

    return (
        <section data-testid="media-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading
                    number="01"
                    eyebrow="Media"
                    title={
                        <>
                            Khotbah, renungan, dan{" "}
                            <span className="font-serif italic text-sabbath-600">materi</span>{" "}
                            jemaat
                        </>
                    }
                    description="Arsip media GMAHK Rinegetan — untuk Anda yang rindu mendengar kembali, atau yang belum sempat hadir."
                />

                <div
                    role="group"
                    aria-label="Saring media berdasarkan jenis"
                    className="mt-10 flex flex-wrap gap-2"
                >
                    {TYPES.map((type) => (
                        <button
                            key={type}
                            type="button"
                            data-testid={`media-filter-${type.toLowerCase()}`}
                            aria-pressed={filter === type}
                            onClick={() => setFilter(type)}
                            className={cn(
                                "rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-[background-color,color,border-color] duration-200",
                                filter === type
                                    ? "border-navy bg-navy text-white"
                                    : "border-navy/15 bg-white text-slate-600 hover:border-navy/40 hover:text-navy"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((item, i) => (
                        <Reveal key={item.id} delay={0.06 * i}>
                            <article
                                data-testid={`media-item-${item.id}`}
                                className="card-surface group flex h-full flex-col overflow-hidden"
                            >
                                <div className="img-frame relative aspect-[16/10] rounded-b-none border-0">
                                    <img
                                        src={item.image}
                                        alt={`Sampul: ${item.title}`}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                    />
                                    <span className="chip absolute left-4 top-4 !bg-white/95 shadow-sm">
                                        {item.type}
                                    </span>
                                    {(item.type === "Khotbah" || item.type === "Video") && (
                                        <span
                                            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-sabbath-500 text-navy-900 transition-transform duration-300 group-hover:scale-110"
                                            aria-hidden="true"
                                        >
                                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <h3 className="text-lg font-semibold tracking-tight text-navy">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                                        {item.description}
                                    </p>
                                    <p className="mt-4 border-t border-navy/[0.07] pt-3.5 font-mono text-xs text-slate-500">
                                        {item.meta}
                                    </p>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
