import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { EntityLockup } from "@/components/identity/EntityLockup";
import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { NAV_LINKS, SABBATH } from "@/data/content";
import { cn } from "@/lib/utils";

export const GlobalNav = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <>
            <header
                data-testid="global-nav"
                className="sticky top-0 z-50 border-b border-navy/[0.07] bg-background/85 backdrop-blur-xl"
            >
                <div className="container-site flex h-[4.5rem] items-center justify-between gap-4">
                <EntityLockup compact />

                <nav aria-label="Navigasi utama" className="hidden items-center gap-1 xl:flex">
                    {NAV_LINKS.slice(1).map((link) => (
                        <NavLink
                            key={link.href}
                            to={link.href}
                            data-testid={link.testId}
                            className={({ isActive }) =>
                                cn(
                                    "rounded-full px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-200",
                                    isActive
                                        ? "bg-navy/[0.06] text-navy"
                                        : "text-slate-500 hover:text-navy"
                                )
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden items-center gap-2.5 xl:flex">
                    <Link
                        to="/kontak#berkunjung"
                        data-testid="nav-cta-saya-ingin-berkunjung"
                        className="rounded-full px-4 py-2.5 text-[0.8125rem] font-semibold text-navy transition-colors duration-200 hover:bg-navy/[0.06]"
                    >
                        Saya Ingin Berkunjung
                    </Link>
                    <Link
                        to="/pelayanan#alkitab"
                        data-testid="nav-cta-pelajari-alkitab"
                        className="group inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-[0.8125rem] font-semibold text-white transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-navy-600"
                    >
                        Pelajari Alkitab
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>

                <button
                    type="button"
                    data-testid="mobile-menu-button"
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label={open ? "Tutup menu" : "Buka menu"}
                    onClick={() => setOpen((v) => !v)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/15 text-navy xl:hidden"
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 top-[4.5rem] z-40 flex flex-col overflow-y-auto bg-navy xl:hidden"
                    >
                        <nav aria-label="Navigasi seluler" className="container-site flex flex-1 flex-col justify-center py-10">
                            {NAV_LINKS.map((link, i) => (
                                <motion.div
                                    key={link.href}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.06 * i + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <NavLink
                                        to={link.href}
                                        data-testid={`mobile-${link.testId}`}
                                        className={({ isActive }) =>
                                            cn(
                                                "group flex items-baseline gap-4 border-b border-white/10 py-4",
                                                isActive ? "text-sabbath-400" : "text-white"
                                            )
                                        }
                                    >
                                        <span className="font-mono text-xs text-sabbath-400/80">
                                            0{i + 1}
                                        </span>
                                        <span className="text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                                            {link.label}
                                        </span>
                                    </NavLink>
                                </motion.div>
                            ))}
                        </nav>
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.5 }}
                            className="container-site flex flex-col gap-3 pb-10"
                        >
                            <div className="mb-2 flex items-center gap-3 text-sabbath-400">
                                <AdventistSymbol className="h-6 w-6" />
                                <span className="font-mono text-xs uppercase tracking-[0.24em]">
                                    Sabat · {SABBATH.items[0].name} {SABBATH.items[0].time}
                                </span>
                            </div>
                            <Link
                                to="/pelayanan#alkitab"
                                data-testid="mobile-cta-pelajari-alkitab"
                                className="btn-sabbath w-full"
                            >
                                Pelajari Alkitab
                            </Link>
                            <Link
                                to="/kontak#berkunjung"
                                data-testid="mobile-cta-berkunjung"
                                className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
