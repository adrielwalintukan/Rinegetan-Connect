/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import { BookOpen, Globe, HeartHandshake, Sunrise } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
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

export default function TentangKamiPage() {
    return (
        <>
            <section data-testid="about-hero" className="relative overflow-hidden py-16 lg:py-24">
                <div className="container-site grid grid-cols-1 gap-12 lg:grid-cols-7 lg:gap-12">
                    <div className="lg:col-span-5">
                        <ChapterHeading
                            number="01"
                            eyebrow="Tentang Kami"
                            title={
                                <>
                                    Satu jemaat kecil, satu{" "}
                                    <span className="font-serif italic text-sabbath-600">
                                        keluarga besar
                                    </span>{" "}
                                    Advent sedunia
                                </>
                            }
                        />
                        <Reveal delay={0.1}>
                            <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-600 lg:max-w-2xl">
                                <p>
                                    {CHURCH.name} adalah jemaat {CHURCH.fullName} di{" "}
                                    {CHURCH.region}. Singkatan GMAHK — Gereja Masehi Advent Hari
                                    Ketujuh — adalah nama resmi gereja kami di Indonesia, dan
                                    Rinegetan adalah rumah kami: sebuah desa di Tondano, di kaki
                                    perbukitan Minahasa.
                                </p>
                                <p>
                                    Sebagai bagian dari keluarga Advent sedunia, kami memelihara
                                    Sabat hari ketujuh, menaruh Alkitab sebagai dasar iman, dan
                                    hidup dalam pengharapan akan kedatangan Kristus. Namun di atas
                                    semua label itu, kami adalah tetangga Anda — keluarga, petani,
                                    guru, mahasiswa, dan anak-anak yang belajar mengasihi seperti
                                    Kristus mengasihi.
                                </p>
                                <p>
                                    Setiap Sabtu pagi pintu kami terbuka. Tidak ada syarat untuk
                                    datang, tidak ada kursi khusus — hanya persekutuan yang hangat,
                                    Firman yang hidup, dan meja yang selalu cukup untuk satu tamu
                                    lagi.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                    <Reveal delay={0.2} className="lg:col-span-2">
                        <div
                            data-testid="about-identity-card"
                            className="card-surface flex h-full flex-col justify-between gap-8 p-7"
                        >
                            <div>
                                <p className="label-eyebrow">Identitas Jemaat</p>
                                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                                    Lambang di bawah adalah lambang resmi Gereja Masehi Advent Hari
                                    Ketujuh — Alkitab yang terbuka, Salib, dan nyala api Roh.
                                    Kami menggunakannya sesuai pedoman identitas resmi gereja,
                                    tanpa diubah.
                                </p>
                            </div>
                            <div className="rounded-xl bg-sabbath-50 p-6">
                                <EntityLockup />
                            </div>
                            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-slate-400">
                                Bagian dari GMAHK sedunia · ±22 juta anggota
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            <section
                data-testid="about-values"
                aria-labelledby="about-values-heading"
                className="bg-navy-50/50 py-20 lg:py-24"
            >
                <div className="container-site">
                    <ChapterHeading
                        number="02"
                        eyebrow="Yang Kami Pegang"
                        title={<span id="about-values-heading">Empat hal yang menuntun kami</span>}
                    />
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {VALUES.map((v, i) => (
                            <Reveal key={v.title} delay={0.08 * i}>
                                <article
                                    data-testid={`about-value-${i}`}
                                    className="card-surface h-full p-6"
                                >
                                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-sabbath-400">
                                        <v.icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-4 text-base font-semibold text-navy">
                                        {v.title}
                                    </h3>
                                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-600">
                                        {v.text}
                                    </p>
                                </article>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal delay={0.15}>
                        <figure className="img-frame mt-10 aspect-[21/9]">
                            <img
                                src={IMAGES.community.src}
                                alt={IMAGES.community.alt}
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        </figure>
                    </Reveal>
                </div>
            </section>
        </>
    );
}
