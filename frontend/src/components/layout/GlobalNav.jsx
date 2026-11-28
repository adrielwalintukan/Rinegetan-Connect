"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { EntityLockup } from "@/components/identity/EntityLockup";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { NAV_GROUPS, NAV_LINKS, SABBATH } from "@/data/content";
import { cn } from "@/lib/utils";

export const GlobalNav = () => {
    const [open, setOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const isHome = pathname === "/";
    const closeMenu = () => {
        setOpen(false);
        setOpenGroup(null);
    };
    // Only the home hero sits under the header; everywhere else the header stays solid navy.
    const transparent = isHome && !scrolled && !open;

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            setOpen(false);
            setOpenGroup(null);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    useEffect(() => {
        if (!isHome) return undefined;
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isHome]);

    return (
        <>
            <header
                data-testid="global-nav"
                data-nav-tone={transparent ? "transparent" : "solid"}
                className={cn(
                    "inset-x-0 top-0 z-50 text-white transition-[background-color,box-shadow] duration-500",
                    isHome ? "fixed" : "sticky",
                    transparent
                        ? "bg-gradient-to-b from-navy-900/75 via-navy-900/30 to-transparent"
                        : "bg-navy shadow-[0_1px_0_rgba(255,255,255,0.08)]"
                )}
            >
                <div className="flex h-[4.5rem] w-full items-center justify-between gap-6 px-5 sm:px-8 lg:px-12 xl:h-[7.5rem]">
                    <EntityLockup dark compact onClick={closeMenu} />

                    <div className="hidden flex-col items-end gap-4 xl:flex">
                        <ul className="flex items-center gap-7 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white/85">
                            <li>
                                <Link
                                    href="/kontak#berkunjung"
                                    onClick={closeMenu}
                                    data-testid="nav-cta-saya-ingin-berkunjung"
                                    className="transition-colors hover:text-sabbath-400"
                                >
                                    Kunjungi Gereja
                                </Link>
                            </li>
                            <li>
                                <Link href="/kegiatan" onClick={closeMenu} className="transition-colors hover:text-sabbath-400">
                                    Kegiatan
                                </Link>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    data-testid="nav-utility-menu"
                                    aria-expanded={open}
                                    aria-controls="mobile-menu"
                                    onClick={() => setOpen((v) => !v)}
                                    className="inline-flex items-center gap-2 uppercase tracking-[0.16em] transition-colors hover:text-sabbath-400"
                                >
                                    {open ? "Tutup" : "Menu"}
                                    {open ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Menu className="h-3.5 w-3.5" aria-hidden="true" />}
                                </button>
                            </li>
                        </ul>

                        <div className="flex items-center gap-8">
                            <nav aria-label="Navigasi utama" className="flex items-center gap-7">
                                {NAV_GROUPS.map((group) => {
                                    const expanded = openGroup === group.id;
                                    const active = group.links.some((link) => link.href === pathname);
                                    return (
                                        <div
                                            key={group.id}
                                            className="relative"
                                            onMouseEnter={() => setOpenGroup(group.id)}
                                            onMouseLeave={() => setOpenGroup(null)}
                                            onBlur={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget)) setOpenGroup(null);
                                            }}
                                        >
                                            <button
                                                type="button"
                                                data-testid={`nav-group-${group.id}`}
                                                aria-expanded={expanded}
                                                aria-controls={`nav-panel-${group.id}`}
                                                // Hover already opened it, so a mouse click (detail > 0) must not close it; keyboard toggles.
                                                onClick={(e) => setOpenGroup(expanded && e.detail === 0 ? null : group.id)}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 border-b-2 py-1.5 font-serif text-[1.125rem] transition-colors",
                                                    active ? "border-sabbath-400" : "border-transparent hover:border-white/40"
                                                )}
                                            >
                                                {group.label}
                                                <ChevronDown
                                                    className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            {expanded && (
                                                <div id={`nav-panel-${group.id}`} className="absolute left-0 top-full pt-3">
                                                    <ul className="min-w-56 rounded-xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(7,27,48,0.55)]">
                                                        {group.links.map((link) => (
                                                            <li key={link.href}>
                                                                <Link
                                                                    href={link.href}
                                                                    prefetch={link.href === "/pelajari-alkitab" ? false : undefined}
                                                                    onClick={closeMenu}
                                                                    aria-current={pathname === link.href ? "page" : undefined}
                                                                    data-testid={link.testId}
                                                                    className={cn(
                                                                        "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                                                        pathname === link.href
                                                                            ? "bg-sabbath-100 text-navy"
                                                                            : "text-slate-600 hover:bg-navy-50 hover:text-navy"
                                                                    )}
                                                                >
                                                                    {link.label}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </nav>
                            <Link
                                href="/pelajari-alkitab" prefetch={false}
                                onClick={closeMenu}
                                data-testid="nav-cta-pelajari-alkitab"
                                className="group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sabbath-500 px-6 py-2.5 text-sm font-semibold text-navy-900 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-sabbath-400"
                            >
                                Pelajari Alkitab
                                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                        </div>
                    </div>

                    <button
                        type="button"
                        data-testid="mobile-menu-button"
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                        aria-label={open ? "Tutup menu" : "Buka menu"}
                        onClick={() => setOpen((v) => !v)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white xl:hidden"
                    >
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        id="mobile-menu"
                        data-testid="mobile-menu"
                        data-lenis-prevent
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 top-[4.5rem] z-40 flex flex-col overflow-y-auto bg-navy xl:top-[7.5rem]"
                    >
                        <nav aria-label="Navigasi seluler" className="container-site flex flex-1 flex-col justify-center py-10">
                            {NAV_LINKS.map((link, i) => (
                                <motion.div
                                    key={link.href}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.06 * i + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <Link
                                        href={link.href}
                                        onClick={closeMenu}
                                        aria-current={pathname === link.href ? "page" : undefined}
                                        data-testid={`mobile-${link.testId}`}
                                        className={cn(
                                            "group flex items-baseline gap-4 border-b border-white/10 py-4",
                                            pathname === link.href ? "text-sabbath-400" : "text-white"
                                        )}
                                    >
                                        <span className="font-mono text-xs text-sabbath-400/80">
                                            0{i + 1}
                                        </span>
                                        <span className="text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                                            {link.label}
                                        </span>
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.5 }}
                            className="container-site flex flex-col gap-3 pb-10 sm:flex-row sm:flex-wrap sm:items-center"
                        >
                            <div className="mb-2 flex items-center gap-3 text-sabbath-400 sm:mb-0 sm:mr-auto">
                                <AdventistSymbol className="h-6 w-6" />
                                <span className="font-mono text-xs uppercase tracking-[0.24em]">
                                    Sabat · {SABBATH.items[0].name} {SABBATH.items[0].time}
                                </span>
                            </div>
                            <Link
                                href="/pelajari-alkitab" prefetch={false}
                                onClick={closeMenu}
                                data-testid="mobile-cta-pelajari-alkitab"
                                className="btn-sabbath w-full sm:w-auto"
                            >
                                Pelajari Alkitab
                            </Link>
                            <Link
                                href="/kontak#berkunjung"
                                onClick={closeMenu}
                                data-testid="mobile-cta-berkunjung"
                                className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                            >
                                Saya Ingin Berkunjung
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
