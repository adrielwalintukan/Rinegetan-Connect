import React from "react";
import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  testId?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
  testId = "empty-state",
  compact = false,
}) => {
  return (
    <div
      data-testid={testId}
      className={`card-surface flex flex-col items-center justify-center text-center border border-navy/10 rounded-2xl ${
        compact ? "p-6 sm:p-8" : "p-8 sm:p-12"
      } bg-white/80 backdrop-blur-sm ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sabbath-50 border border-sabbath-200/60 text-sabbath-700 shadow-sm transition-transform duration-300 hover:scale-105">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>

      <h3 className="mt-5 text-lg sm:text-xl font-semibold tracking-tight text-navy">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-md mx-auto">
        {description}
      </p>

      {actionLabel && actionHref && (
        <div className="mt-6">
          <Link
            href={actionHref}
            data-testid={`${testId}-action`}
            className="btn-secondary text-[0.8125rem] !px-5 !py-2.5 inline-flex items-center gap-2"
          >
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
};
