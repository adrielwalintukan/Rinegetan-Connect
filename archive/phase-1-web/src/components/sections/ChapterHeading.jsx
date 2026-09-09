import { Reveal } from "@/components/motion/Reveal";

export const ChapterHeading = ({ number, eyebrow, title, description, align = "left" }) => (
    <Reveal
        className={
            align === "center"
                ? "mx-auto flex max-w-2xl flex-col items-center text-center"
                : "max-w-3xl"
        }
    >
        <p className="flex items-baseline gap-3">
            <span className="font-mono text-xs font-medium text-sabbath-600" aria-hidden="true">
                {number}
            </span>
            <span className="label-eyebrow">{eyebrow}</span>
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy sm:text-3xl lg:text-4xl">
            {title}
        </h2>
        {description && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">{description}</p>
        )}
    </Reveal>
);
