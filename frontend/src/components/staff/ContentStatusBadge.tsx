import React from "react";
import type { ContentStatus } from "@/types/content";
import { cn } from "@/lib/utils";

interface ContentStatusBadgeProps {
  status: ContentStatus | string;
  className?: string;
}

export const ContentStatusBadge: React.FC<ContentStatusBadgeProps> = ({
  status,
  className,
}) => {
  const getBadgeConfig = (st: string) => {
    switch (st) {
      case "published":
        return {
          label: "Terbit",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "archived":
        return {
          label: "Arsip",
          classes: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-400",
        };
      case "draft":
      default:
        return {
          label: "Draft",
          classes: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        config.classes,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  );
};
