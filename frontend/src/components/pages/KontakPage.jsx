"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { CHURCH, SABBATH } from "@/data/content";

export default function KontakPage() {
    return (
        <section data-testid="kontak-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading as="h1"
                    number="01"
                    eyebrow="Kontak"
                    title={
                        <>
                            Mari{" "}
                            <span className="font-serif italic text-sabbath-600">terhubung</span>
                        </>
                    }
                    description="Pertanyaan tentang ibadah, pelajaran Alkitab, atau sekadar menyapa — kami senang mendengar dari Anda."
                />

                <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-7 lg:gap-12">
                    <Reveal className="lg:col-span-4">
                        {/* Online messages are a Phase 3 feature; a form that pretends to send would lose prayer requests. */}
                        <div data-testid="contact-in-person" className="card-surface p-6 sm:p-8">
                            <h2 className="text-lg font-semibold text-navy">Sampaikan langsung saat Sabat</h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                Formulir pesan daring sedang disiapkan. Untuk saat ini, pertanyaan tentang ibadah,
                                pelajaran Alkitab, maupun permohonan doa dapat disampaikan langsung kepada pengurus
                                jemaat ketika Anda hadir pada hari Sabat.
                            </p>
                            <p className="mt-5 flex items-center gap-2.5 text-sm font-semibold text-navy">
                                <Clock className="h-4 w-4 text-sabbath-600" aria-hidden="true" />
                                {SABBATH.items[0].name} · {SABBATH.items[0].time}
                            </p>
                        </div>
                    </Reveal>

                    <div className="space-y-4 lg:col-span-3">
                        <Reveal delay={0.1}>
                            <div
                                id="berkunjung"
                                data-testid="visit-info-card"
                                className="card-surface scroll-mt-32 border-sabbath-500/30 bg-sabbath-50 p-6"
                            >
                                <h2 className="text-lg font-semibold text-navy">
                                    Pertama kali berkunjung?
                                </h2>
                                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                                    Datanglah Sabtu pagi — {SABBATH.items[0].name} dimulai pukul{" "}
                                    {SABBATH.items[0].time}. Anda disambut sebagai tamu; tidak ada
                                    persiapan khusus yang perlu dilakukan.
                                </p>
                            </div>
                        </Reveal>
                        <Reveal delay={0.15}>
                            <address className="card-surface not-italic p-6">
                                <ul className="space-y-4 text-sm text-slate-600">
                                    <li className="flex gap-3">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-600" aria-hidden="true" />
                                        <span data-testid="contact-address">{CHURCH.address}</span>
                                    </li>
                                    {CHURCH.phone && (
                                    <li className="flex gap-3">
                                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-600" aria-hidden="true" />
                                        <a
                                            href={`tel:${CHURCH.phone.replace(/[^+\d]/g, "")}`}
                                            data-testid="contact-phone"
                                            className="transition-colors hover:text-navy"
                                        >
                                            {CHURCH.phone}
                                        </a>
                                    </li>
                                    )}
                                    {CHURCH.whatsapp && (
                                    <li className="flex gap-3">
                                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-600" aria-hidden="true" />
                                        <a
                                            href={CHURCH.whatsapp}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-testid="contact-whatsapp"
                                            className="transition-colors hover:text-navy"
                                        >
                                            WhatsApp jemaat
                                        </a>
                                    </li>
                                    )}
                                    {CHURCH.email && (
                                    <li className="flex gap-3">
                                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-600" aria-hidden="true" />
                                        <a
                                            href={`mailto:${CHURCH.email}`}
                                            data-testid="contact-email"
                                            className="transition-colors hover:text-navy"
                                        >
                                            {CHURCH.email}
                                        </a>
                                    </li>
                                    )}
                                </ul>
                            </address>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <div className="img-frame overflow-hidden">
                                <iframe
                                    title="Peta lokasi GMAHK Rinegetan"
                                    data-testid="contact-map"
                                    src={`https://www.google.com/maps?q=${encodeURIComponent(CHURCH.mapsQuery)}&output=embed`}
                                    className="h-64 w-full grayscale-[0.4]"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    );
}
