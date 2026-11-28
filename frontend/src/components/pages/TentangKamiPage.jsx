/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import { BookOpen, Globe, HeartHandshake, Sunrise } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { EntityLockup } from "@/components/identity/EntityLockup";
import { CHURCH, IMAGES } from "@/data/content";

const VALUES = [
    {
        icon: BookOpen,
        title: "Alkitab sebagai dasar",
        text: "Firman Tuhan adalah satu-satunya ukuran iman dan pengajaran kami.",
    },
    {
        icon: Sunrise,
        title: "Sabat hari ketujuh",
        text: "Kami memelihara Sabat sebagai tanda perjanjian, perhentian, dan pengharapan.",
    },
    {
        icon: HeartHandshake,
        title: "Kasih yang melayani",
        text: "Iman diwujudkan dalam pelayanan nyata bagi keluarga dan masyarakat desa.",
    },
    {
        icon: Globe,
        title: "Pengharapan Advent",
        text: "Kami menantikan kedatangan Yesus kembali dan membagikan pengharapan itu.",
    },
];

const OBJECT_FIT = {
    contain: "object-contain",
    bottom: "object-cover object-bottom",
    top: "object-cover object-top",
};

/**
 * @param {{ sectionMedia?: any }} props
 */
export default function TentangKamiPage({ sectionMedia = null }) {
    const media = sectionMedia?.tentang_kami;
    return (
        <>
            <section data-testid="about-hero" className="relative pb-20 sm:pb-28">
                <PageHero
                    number="01"
                    eyebrow="Tentang Kami"
                    title={<>Bagian dari <Accent>keluarga besar</Accent> Advent sedunia</>}
                />
                <div className="mx-auto grid w-full max-w-[96rem] gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12">
                    <Reveal className="lg:col-span-7">
                        <div className="space-y-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                            <p className="text-xl leading-relaxed text-navy sm:text-2xl">
                                {CHURCH.name} adalah jemaat {CHURCH.fullName} di {CHURCH.region}.
                            </p>
                            <p>
                                Singkatan GMAHK — Gereja Masehi Advent Hari Ketujuh — adalah nama resmi gereja kami
                                di Indonesia. Jemaat kami berada di Rinegetan, Tondano, Kabupaten Minahasa.
                            </p>
                            <p>
                                Sebagai bagian dari keluarga Advent sedunia, kami memelihara Sabat hari ketujuh,
                                menaruh Alkitab sebagai dasar iman, dan hidup dalam pengharapan akan kedatangan
                                Kristus yang kedua kali.
                            </p>
                            <p>
                                Ibadah Sabat terbuka untuk umum. Siapa pun disambut untuk beribadah, mempelajari
                                Alkitab, dan bersekutu bersama kami.
                            </p>
                        </div>
                    </Reveal>
                    <Reveal delay={0.15} className="lg:col-span-5">
                        <div
                            data-testid="about-identity-card"
                            className="flex h-full flex-col justify-between gap-8 rounded-2xl border border-navy/[0.08] bg-white p-7 shadow-[0_24px_48px_-32px_rgba(7,27,48,0.35)] sm:p-9"
                        >
                            <div>
                                <p className="label-eyebrow">Identitas Jemaat</p>
                                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                                    Lambang di bawah adalah lambang resmi Gereja Masehi Advent Hari Ketujuh — Alkitab
                                    yang terbuka, Salib, dan nyala api Roh. Kami menggunakannya sesuai pedoman
                                    identitas resmi gereja, tanpa diubah.
                                </p>
                            </div>
                            <div className="rounded-xl bg-sabbath-50 p-6">
                                <EntityLockup />
                            </div>
                            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-slate-600">
                                Bagian dari GMAHK sedunia · ±22 juta anggota
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            <section
                data-testid="about-values"
                aria-labelledby="about-values-heading"
                className="bg-navy-50/60 py-20 sm:py-28 lg:py-32"
            >
                <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
                    <Reveal className="max-w-3xl">
                        <p className="flex items-baseline gap-3">
                            <span className="font-mono text-xs font-medium text-sabbath-600" aria-hidden="true">02</span>
                            <span className="label-eyebrow">Yang Kami Pegang</span>
                        </p>
                        <h2
                            id="about-values-heading"
                            className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-6xl"
                        >
                            Empat hal yang <span className="font-serif italic text-sabbath-600">menuntun</span> kami
                        </h2>
                    </Reveal>
                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {VALUES.map((v, i) => (
                            <Reveal key={v.title} delay={0.08 * i}>
                                <article
                                    data-testid={`about-value-${i}`}
                                    className="group h-full rounded-2xl border border-navy/[0.08] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-sabbath-500/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-sabbath-400">
                                            <v.icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <span className="font-mono text-xs text-slate-500" aria-hidden="true">0{i + 1}</span>
                                    </div>
                                    <h3 className="mt-6 text-xl font-semibold tracking-tight text-navy">{v.title}</h3>
                                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{v.text}</p>
                                </article>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal delay={0.15}>
                        <figure className="m-0 mt-12 aspect-[4/3] overflow-hidden rounded-2xl bg-navy-100 sm:aspect-[21/9]">
                            <img
                                src={media?.image_url || media?.url || IMAGES.community.src}
                                alt={media?.alt_text || IMAGES.community.alt}
                                loading="lazy"
                                className={`h-full w-full ${OBJECT_FIT[media?.object_position] || "object-cover object-center"}`}
                            />
                        </figure>
                    </Reveal>
                </div>
            </section>
        </>
    );
}
