import Link from "next/link";
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail, Clock } from "lucide-react";
import { EntityLockup } from "@/components/identity/EntityLockup";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { CHURCH, NAV_LINKS, SABBATH } from "@/data/content";

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, youtube: Youtube };

export const GlobalFooter = () => (
    <footer data-testid="global-footer" className="relative overflow-hidden bg-navy text-white">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden lg:block"
        >
            <div className="mx-auto grid h-full max-w-7xl grid-cols-7 px-10">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className={
                            i === 6
                                ? "border-l border-r border-white/[0.05] bg-sabbath-400/[0.06]"
                                : "border-l border-white/[0.05]"
                        }
                    />
                ))}
            </div>
        </div>

        <div className="container-site relative grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-7 lg:gap-10 lg:py-20">
            <div className="lg:col-span-2">
                <EntityLockup dark />
                <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">
                    {CHURCH.entity} — bagian dari {CHURCH.fullName} sedunia.{" "}
                    {CHURCH.tagline}.
                </p>
                <div className="mt-6 flex gap-2">
                    {CHURCH.socials.map((s) => {
                        const Icon = SOCIAL_ICONS[s.icon];
                        return (
                            <a
                                key={s.label}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={s.label}
                                data-testid={`footer-social-${s.icon}`}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-[background-color,color,transform] duration-300 hover:-translate-y-0.5 hover:border-sabbath-400 hover:text-sabbath-400"
                            >
                                <Icon className="h-4 w-4" />
                            </a>
                        );
                    })}
                </div>
            </div>

            <nav aria-label="Tautan cepat" className="lg:col-span-1">
                <h2 className="label-eyebrow !text-sabbath-400">Jelajah</h2>
                <ul className="mt-5 space-y-2.5">
                    {NAV_LINKS.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                data-testid={`footer-link-${link.href === "/" ? "beranda" : link.href.slice(1)}`}
                                className="text-sm text-white/70 transition-colors hover:text-sabbath-400"
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="lg:col-span-2">
                <h2 className="label-eyebrow !text-sabbath-400">Kontak & Lokasi</h2>
                <ul className="mt-5 space-y-4 text-sm text-white/70">
                    <li className="flex gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                        <span data-testid="footer-address">{CHURCH.address}</span>
                    </li>
                    <li className="flex gap-3">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                        <a href={`tel:${CHURCH.phone.replace(/[^+\d]/g, "")}`} data-testid="footer-phone" className="transition-colors hover:text-sabbath-400">
                            {CHURCH.phone}
                        </a>
                    </li>
                    <li className="flex gap-3">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                        <a href={`mailto:${CHURCH.email}`} data-testid="footer-email" className="transition-colors hover:text-sabbath-400">
                            {CHURCH.email}
                        </a>
                    </li>
                    <li className="flex gap-3">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sabbath-400" aria-hidden="true" />
                        <span>
                            Sabat: {SABBATH.items[0].name} {SABBATH.items[0].time}
                        </span>
                    </li>
                </ul>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
                <h2 className="label-eyebrow !text-sabbath-400">Peta</h2>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                    <iframe
                        title="Peta lokasi GMAHK Rinegetan"
                        data-testid="footer-map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(CHURCH.mapsQuery)}&output=embed`}
                        className="h-48 w-full grayscale-[0.4]"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            </div>
        </div>

        <div className="relative border-t border-white/10">
            <div className="container-site flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
                <p className="flex items-center gap-2.5 text-xs text-white/50">
                    <span className="text-sabbath-400">
                        <AdventistSymbol className="h-4 w-4" />
                    </span>
                    © 2026 {CHURCH.name} · {CHURCH.fullName}
                </p>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-white/40">
                    Rinegetan Connect — Fase 1
                </p>
            </div>
        </div>
    </footer>
);
