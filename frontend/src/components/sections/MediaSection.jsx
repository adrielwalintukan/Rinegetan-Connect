/* eslint-disable @next/next/no-img-element -- photos come from the private-bucket proxy, not next/image. */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { getMediaPublicUrl } from "@/lib/media/url.mjs";

/** Latest published photos from the gallery; hidden until the church publishes some. */
export const MediaSection = ({ photos = [] }) => {
    if (photos.length === 0) return null;

    return (
        <section
            data-testid="media-section"
            aria-labelledby="media-heading"
            className="bg-navy py-20 text-white lg:py-28"
        >
            <div className="container-site">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <Reveal className="max-w-3xl">
                        <p className="label-eyebrow !text-white/50">Galeri Jemaat</p>
                        <h2
                            id="media-heading"
                            className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
                        >
                            Kebersamaan jemaat dalam{" "}
                            <span className="font-serif italic text-sabbath-400">gambar</span>
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <Link
                            href="/media"
                            data-testid="media-view-all"
                            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-6 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-white/10"
                        >
                            Lihat Galeri
                            <ArrowUpRight
                                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </Reveal>
                </div>

                <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {photos.slice(0, 4).map((photo, i) => (
                        <li key={photo.id}>
                            <Reveal delay={0.06 * i} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
                                <img
                                    src={getMediaPublicUrl(photo.storage_path)}
                                    alt={photo.alt_text}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                />
                                {photo.caption && (
                                    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/90 to-transparent p-3 text-xs text-white/90">
                                        {photo.caption}
                                    </p>
                                )}
                            </Reveal>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};
