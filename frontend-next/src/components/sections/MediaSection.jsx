/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { MEDIA_ITEMS } from "@/data/content";

export const MediaSection = () => {
    const [featured, ...rest] = MEDIA_ITEMS;
    return (
        <section
            data-testid="media-section"
            aria-labelledby="media-heading"
            className="bg-navy py-20 text-white lg:py-28"
        >
            <div className="container-site">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <Reveal className="max-w-3xl">
                        <p className="flex items-baseline gap-3">
                            <span className="font-mono text-xs font-medium text-sabbath-400" aria-hidden="true">
                                05
                            </span>
                            <span className="label-eyebrow !text-white/50">Media & Renungan</span>
                        </p>
                        <h2
                            id="media-heading"
                            className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
                        >
                            Firman yang bisa Anda bawa{" "}
                            <span className="font-serif italic text-sabbath-400">pulang</span>
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <Link
                            href="/media"
                            data-testid="media-view-all"
                            className="group inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-white/10"
                        >
                            Semua Media
                            <ArrowUpRight
                                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </Reveal>
                </div>

                <div className="mt-12 grid gap-6 lg:grid-cols-7">
                    <Reveal className="lg:col-span-4">
                        <article
                            data-testid={`media-card-${featured.id}`}
                            className="group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-xl border border-white/10"
                        >
                            <img
                                src={featured.image}
                                alt={`Sampul: ${featured.title}`}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-[1.04]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/30 to-transparent" aria-hidden="true" />
                            <span
                                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sabbath-500 text-navy-900 shadow-[0_16px_40px_-12px_rgba(229,169,60,0.7)] transition-transform duration-300 group-hover:scale-110"
                                aria-hidden="true"
                            >
                                <Play className="ml-0.5 h-6 w-6 fill-current" />
                            </span>
                            <div className="relative p-7">
                                <span className="chip !border-sabbath-400/40 !bg-navy-900/70 !text-sabbath-400">
                                    {featured.type}
                                </span>
                                <h3 className="mt-3 text-xl font-semibold sm:text-2xl">
                                    {featured.title}
                                </h3>
                                <p className="mt-2 text-sm text-white/70">{featured.description}</p>
                                <p className="mt-3 font-mono text-xs text-sabbath-400/90">
                                    {featured.meta}
                                </p>
                            </div>
                        </article>
                    </Reveal>

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1">
                        {rest.map((item, i) => (
                            <Reveal key={item.id} delay={0.08 * i}>
                                <article
                                    data-testid={`media-card-${item.id}`}
                                    className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-[background-color,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-sabbath-400/40 hover:bg-white/[0.08]"
                                >
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                                        <img
                                            src={item.image}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.2em] text-sabbath-400">
                                            {item.type}
                                        </span>
                                        <h3 className="mt-1 truncate text-sm font-semibold">
                                            {item.title}
                                        </h3>
                                        <p className="mt-0.5 truncate text-xs text-white/50">
                                            {item.meta}
                                        </p>
                                    </div>
                                </article>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
