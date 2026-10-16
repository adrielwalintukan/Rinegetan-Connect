import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { CHURCH, SABBATH } from "@/data/content";

const TOPICS = ["Saya ingin berkunjung", "Pelajaran Alkitab", "Permohonan doa", "Lainnya"];

export default function KontakPage() {
    const [form, setForm] = useState({ nama: "", email: "", topik: TOPICS[0], pesan: "" });
    const [errors, setErrors] = useState({});

    const update = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((err) => ({ ...err, [key]: undefined }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        const next = {};
        if (!form.nama.trim()) next.nama = "Mohon isi nama Anda.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            next.email = "Mohon isi alamat email yang valid.";
        if (form.pesan.trim().length < 10)
            next.pesan = "Pesan minimal 10 karakter.";
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        toast.success("Terima kasih! Pesan Anda telah kami terima.", {
            description: "Tim jemaat akan menghubungi Anda segera, dalam 1–2 hari.",
        });
        setForm({ nama: "", email: "", topik: TOPICS[0], pesan: "" });
    };

    const inputClass =
        "w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-sm text-navy placeholder:text-slate-400 transition-[border-color,box-shadow] duration-200 focus:border-sabbath-500";

    return (
        <section data-testid="kontak-page" className="py-16 lg:py-24">
            <div className="container-site">
                <ChapterHeading
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
                        <form
                            data-testid="contact-form"
                            onSubmit={onSubmit}
                            noValidate
                            className="card-surface p-7 lg:p-9"
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="kontak-nama"
                                        className="mb-2 block text-sm font-semibold text-navy"
                                    >
                                        Nama lengkap
                                    </label>
                                    <input
                                        id="kontak-nama"
                                        data-testid="contact-name-input"
                                        type="text"
                                        autoComplete="name"
                                        value={form.nama}
                                        onChange={update("nama")}
                                        aria-invalid={Boolean(errors.nama)}
                                        aria-describedby={errors.nama ? "err-nama" : undefined}
                                        placeholder="Nama Anda"
                                        className={inputClass}
                                    />
                                    {errors.nama && (
                                        <p id="err-nama" role="alert" className="mt-1.5 text-xs text-red-700">
                                            {errors.nama}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label
                                        htmlFor="kontak-email"
                                        className="mb-2 block text-sm font-semibold text-navy"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="kontak-email"
                                        data-testid="contact-email-input"
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={update("email")}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "err-email" : undefined}
                                        placeholder="nama@email.com"
                                        className={inputClass}
                                    />
                                    {errors.email && (
                                        <p id="err-email" role="alert" className="mt-1.5 text-xs text-red-700">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-5">
                                <label
                                    htmlFor="kontak-topik"
                                    className="mb-2 block text-sm font-semibold text-navy"
                                >
                                    Topik
                                </label>
                                <select
                                    id="kontak-topik"
                                    data-testid="contact-topic-select"
                                    value={form.topik}
                                    onChange={update("topik")}
                                    className={inputClass}
                                >
                                    {TOPICS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-5">
                                <label
                                    htmlFor="kontak-pesan"
                                    className="mb-2 block text-sm font-semibold text-navy"
                                >
                                    Pesan
                                </label>
                                <textarea
                                    id="kontak-pesan"
                                    data-testid="contact-message-input"
                                    rows={5}
                                    value={form.pesan}
                                    onChange={update("pesan")}
                                    aria-invalid={Boolean(errors.pesan)}
                                    aria-describedby={errors.pesan ? "err-pesan" : undefined}
                                    placeholder="Tuliskan pesan atau pertanyaan Anda…"
                                    className={`${inputClass} resize-y`}
                                />
                                {errors.pesan && (
                                    <p id="err-pesan" role="alert" className="mt-1.5 text-xs text-red-700">
                                        {errors.pesan}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                data-testid="contact-submit-button"
                                className="btn-primary mt-7 w-full sm:w-auto"
                            >
                                Kirim Pesan
                            </button>
                        </form>
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
                                    {SABBATH.items[0].time}. Kenakan pakaian yang nyaman; tim
                                    penyambut kami akan menemani Anda mencari tempat duduk dan
                                    menjawab pertanyaan apa pun.
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
