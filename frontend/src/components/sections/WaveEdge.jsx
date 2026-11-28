import { cn } from "@/lib/utils";

// Page-coloured wave that carves a navy section's top or bottom edge.
export const WaveEdge = ({ position }) => (
    <svg
        aria-hidden="true"
        data-testid="wave-edge"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={cn(
            "pointer-events-none absolute inset-x-0 h-14 w-full text-background sm:h-20 lg:h-28",
            position === "top" ? "top-0" : "bottom-0 rotate-180"
        )}
    >
        <path fill="currentColor" d="M0 0h1440v38c-182 52-396 78-640 46C548 50 330 14 0 64z" />
    </svg>
);
