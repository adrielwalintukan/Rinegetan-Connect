import { Reveal } from "@/components/motion/Reveal";
import { WaveEdge } from "@/components/sections/WaveEdge";

// Navy title band under the solid header, shared by the inner public pages; it carries the page's only h1.
/** @param {{ number?: string, eyebrow: string, title: import("react").ReactNode, description?: string, titleId?: string, children?: import("react").ReactNode }} props */
export const PageHero = ({ number, eyebrow, title, description, titleId, children }) => (
    <header className="relative isolate overflow-hidden bg-gradient-to-b from-navy to-navy-900 pb-24 pt-14 text-white sm:pb-32 sm:pt-20 lg:pb-40 lg:pt-24">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute -right-1/4 -top-1/3 h-[30rem] w-[60rem] rotate-6 rounded-[50%] bg-navy-500/40 blur-3xl" />
            <svg viewBox="0 0 1440 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-white/[0.06]">
                <path d="M0 260C240 160 520 340 760 230S1200 60 1440 140" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M0 310C260 210 540 380 780 280S1210 120 1440 200" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        </div>
        <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
            <Reveal className="max-w-4xl">
                <p className="flex items-baseline gap-3">
                    {number && (
                        <span className="font-mono text-xs font-medium text-sabbath-400" aria-hidden="true">
                            {number}
                        </span>
                    )}
                    <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-white/75">
                        {eyebrow}
                    </span>
                </p>
                <h1 id={titleId} className="mt-5 break-words text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{description}</p>
                )}
                {children && <div className="mt-9 flex flex-wrap gap-3">{children}</div>}
            </Reveal>
        </div>
        <WaveEdge position="bottom" />
    </header>
);

// Accent words inside a PageHero title (amber on navy).
export const Accent = ({ children }) => <span className="font-serif italic text-sabbath-400">{children}</span>;
