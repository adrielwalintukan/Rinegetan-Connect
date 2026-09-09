/* eslint-disable @next/next/no-img-element -- Phase 1 keeps external static fallback images. */
import { BookOpen, HeartHandshake, Sparkles } from "lucide-react";
import { ChapterHeading } from "./ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { IMAGES } from "@/data/content";

const EXPECTATIONS = [
    {
        icon: Sparkles,
        title: "Ibadah yang hidup",
        text: "Pujian, doa, dan khotbah Alkitabiah yang meneguhkan — tanpa formalitas yang kaku.",
    },
    {
        icon: HeartHandshake,
        title: "Komunitas yang peduli",
        text: "Keluarga kedua yang saling menopang, dari anak-anak hingga oma-opa.",
    },
    {
        icon: BookOpen,
        title: "Firman yang menuntun",
        text: "Alkitab sebagai pusat — dipelajari bersama, dihidupi bersama.",
    },
];

export const WelcomeSection = () => (
    <section data-testid="welcome-section" aria-labelledby="welcome-heading" className="py-20 lg:py-28">
        <div className="container-site grid grid-cols-1 gap-12 lg:grid-cols-7 lg:gap-12">
            <div className="lg:col-span-4">
                <ChapterHeading
                    number="02"
                    eyebrow="Selamat Datang"
                    title={
                        <span id="welcome-heading">
                            Selamat Datang di{" "}
                            <span className="font-serif italic text-navy-500">GMAHK Rinegetan</span>
                        </span>
                    }
                    description="Kami adalah keluarga kecil di kaki perbukitan Minahasa yang percaya bahwa iman bertumbuh paling baik dalam kebersamaan. Datanglah sebagaimana Anda adanya — pulanglah dengan pengharapan."
                />
                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                    {EXPECTATIONS.map((item, i) => (
                        <Reveal key={item.title} delay={0.1 * i}>
                            <div
                                data-testid={`welcome-expectation-${i}`}
                                className="card-surface h-full p-5"
                            >
                                <item.icon className="h-5 w-5 text-sabbath-600" aria-hidden="true" />
                                <h3 className="mt-3.5 text-[0.9375rem] font-semibold text-navy">
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-[0.8125rem] leading-relaxed text-slate-600">
                                    {item.text}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
            <Reveal delay={0.15} className="lg:col-span-3">
                <figure className="img-frame h-full min-h-[20rem]">
                    <img
                        src={IMAGES.fellowship.src}
                        alt={IMAGES.fellowship.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                    />
                </figure>
            </Reveal>
        </div>
    </section>
);
