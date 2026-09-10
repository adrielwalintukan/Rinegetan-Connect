import { AdventistSymbol } from "@/components/identity/AdventistSymbol";
import { MARQUEE_ITEMS } from "@/data/content";

export const SabbathMarquee = () => (
    <div
        data-testid="sabbath-marquee"
        className="overflow-hidden border-y border-navy-900/40 bg-navy py-3.5"
        aria-label="Pengumuman jemaat"
    >
        <div className="flex w-max animate-marquee items-center gap-10 pr-10 hover:[animation-play-state:paused]">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                    <span className="font-serif text-base italic text-white/85">{item}</span>
                    <span className="text-sabbath-400" aria-hidden="true">
                        <AdventistSymbol className="h-3.5 w-3.5" title="" />
                    </span>
                </span>
            ))}
        </div>
    </div>
);
