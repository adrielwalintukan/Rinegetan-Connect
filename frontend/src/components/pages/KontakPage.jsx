"use client";

import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero, Accent } from "@/components/sections/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { CHURCH, SABBATH } from "@/data/content";
import { PrayerRequestForm } from "@/components/forms/PrayerRequestForm";
import { VisitForm } from "@/components/forms/VisitForm";

export default function KontakPage() {
    return (
        <section data-testid="kontak-page" className="pb-20 sm:pb-28">
            <PageHero
                number="01"
                eyebrow="Kontak"
                title={<>Mari <Accent>terhubung</Accent></>}
                description="Pertanyaan tentang ibadah, pelajaran Alkitab, atau sekadar menyapa — kami senang mendengar dari Anda."
            />
            <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
                    <Reveal className="lg:col-span-7">
                        <section id="permohonan-doa" aria-labelledby="permohonan-doa-heading" data-testid="prayer-request" className="scroll-mt-32 rounded-2xl border border-navy/[0.08] bg-white p-6 shadow-[0_24px_48px_-32px_rgba(7,27,48,0.35)] sm:p-9">
                            <p className="label-eyebrow">Kami mendoakan Anda</p>
                            <h2 id="permohonan-doa-heading" className="mt-3 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">Permohonan doa</h2>
                            <PrayerRequestForm />
                        </section>
                    </Reveal>

                    <div className="space-y-5 lg:col-span-5">
                        <Reveal delay={0.1}>
                            <div
                                id="berkunjung"
                                data-testid="visit-info-card"
                                className="scroll-mt-32 rounded-2xl border border-sabbath-500/30 bg-sabbath-50 p-6 sm:p-8"
                            >
                                <h2 className="text-2xl font-semibold tracking-tight text-navy">
                                    Pertama kali berkunjung?
                                </h2>
                                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                                    Datanglah Sabtu pagi — {SABBATH.items[0].name} dimulai pukul{" "}
                                    {SABBATH.items[0].time}. Anda disambut sebagai tamu; tidak ada
                                    persiapan khusus yang perlu dilakukan.
                                </p>
                                <section aria-labelledby="kunjungan-form-heading" className="mt-6 border-t border-sabbath-500/20 pt-6">
                                    <h3 id="kunjungan-form-heading" className="text-base font-semibold text-navy">Saya ingin berkunjung</h3>
                                    <VisitForm />
                                </section>
                            </div>
                        </Reveal>
                        <Reveal delay={0.15}>
                            <address id="kontak-gereja" className="scroll-mt-32 rounded-2xl bg-navy-900 p-6 not-italic text-white/80 sm:p-8">
                                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-sabbath-300">Alamat gereja</p>
                                <ul className="mt-5 space-y-4 text-sm">
                                    <li className="flex gap-3">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                                        <span data-testid="contact-address">{CHURCH.address}</span>
                                    </li>
                                    {CHURCH.phone && (
                                    <li className="flex gap-3">
                                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                                        <a
                                            href={`tel:${CHURCH.phone.replace(/[^+\d]/g, "")}`}
                                            data-testid="contact-phone"
                                            className="transition-colors hover:text-white"
                                        >
                                            {CHURCH.phone}
                                        </a>
                                    </li>
                                    )}
                                    {CHURCH.whatsapp && (
                                    <li className="flex gap-3">
                                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                                        <a
                                            href={CHURCH.whatsapp}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-testid="contact-whatsapp"
                                            className="transition-colors hover:text-white"
                                        >
                                            WhatsApp jemaat
                                        </a>
                                    </li>
                                    )}
                                    {CHURCH.email && (
                                    <li className="flex gap-3">
                                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                                        <a
                                            href={`mailto:${CHURCH.email}`}
                                            data-testid="contact-email"
                                            className="transition-colors hover:text-white"
                                        >
                                            {CHURCH.email}
                                        </a>
                                    </li>
                                    )}
                                </ul>
                            </address>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <div className="overflow-hidden rounded-2xl border border-navy/[0.08] bg-navy-100">
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
