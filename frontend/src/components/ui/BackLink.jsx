import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const base = "group inline-flex min-h-11 items-center gap-1.5 rounded-md py-2 font-semibold text-navy underline decoration-sabbath-400 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy";

/**
 * Consistent back navigation: a decorative arrow followed by visible text.
 * Renders a link when `href` is set, otherwise a button for client-side steps.
 * @param {{ href?: string, onClick?: () => void, children: any, className?: string }} props
 */
export default function BackLink({ href, onClick, children, className = "" }) {
  const classes = className ? `${base} ${className}` : base;
  const content = (
    <>
      <ArrowLeft
        aria-hidden="true"
        className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
      <span>{children}</span>
    </>
  );
  if (href) {
    return <Link prefetch={false} href={href} className={classes}>{content}</Link>;
  }
  return <button type="button" onClick={onClick} className={classes}>{content}</button>;
}
