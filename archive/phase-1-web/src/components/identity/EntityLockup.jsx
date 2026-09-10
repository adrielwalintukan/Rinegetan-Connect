import { Link } from "react-router-dom";
import { AdventistSymbol } from "./AdventistSymbol";
import { CHURCH } from "@/data/content";
import { cn } from "@/lib/utils";

export const EntityLockup = ({ dark = false, compact = false }) => (
    <Link
        to="/"
        data-testid="brand-lockup"
        aria-label={`${CHURCH.name} — kembali ke Beranda`}
        className="group flex items-center gap-3"
    >
        <span
            className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]",
                dark ? "text-white" : "text-navy"
            )}
        >
            <AdventistSymbol className="h-10 w-10" />
        </span>
        <span className="flex flex-col leading-none">
            <span
                className={cn(
                    "text-[0.5625rem] font-semibold uppercase tracking-[0.22em]",
                    dark ? "text-white/60" : "text-slate-500"
                )}
            >
                {CHURCH.fullName}
            </span>
            <span
                className={cn(
                    "mt-1.5 text-lg font-bold tracking-tight",
                    compact && "text-base",
                    dark ? "text-white" : "text-navy"
                )}
            >
                {CHURCH.entity}
            </span>
        </span>
    </Link>
);
