import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { cn } from "@/lib/utils";

export const GridGuides = ({ dark = false }) => (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="mx-auto grid h-full max-w-7xl grid-cols-7 px-10">
            {Array.from({ length: 7 }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "border-l",
                        i === 6 && "border-r bg-sabbath-400/[0.07]",
                        dark ? "border-white/[0.05]" : "border-navy/[0.045]"
                    )}
                />
            ))}
        </div>
    </div>
);

export const CreationGrid = ({ children, className }) => (
    <div className={cn("grid grid-cols-1 gap-10 lg:grid-cols-7 lg:gap-12", className)}>
        {children}
    </div>
);

export const MainColumns = ({ children, className, span = 6 }) => (
    <div className={cn(span === 6 ? "lg:col-span-6" : "lg:col-span-5", className)}>
        {children}
    </div>
);

export const SabbathColumn = ({ children, className, label = "Hari Ketujuh" }) => (
    <aside
        data-testid="sabbath-column"
        aria-label="Kolom Sabat"
        className={cn(
            "relative flex flex-row items-center justify-between gap-4 overflow-hidden rounded-xl border border-sabbath-500/25 bg-sabbath-100/60 p-5 lg:col-span-1 lg:flex-col lg:items-start lg:justify-between lg:p-6",
            className
        )}
    >
        <span className="label-eyebrow !text-sabbath-700 lg:[writing-mode:vertical-rl] lg:rotate-180">
            {label}
        </span>
        <span className="text-sabbath-600">
            <AdventistSymbol className="h-9 w-9 lg:h-12 lg:w-12" />
        </span>
        {children}
    </aside>
);
