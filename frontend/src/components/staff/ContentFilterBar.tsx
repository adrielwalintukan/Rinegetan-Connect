"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentFilterBarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    all: number;
    draft: number;
    published: number;
    archived: number;
  };
  className?: string;
}

export const ContentFilterBar: React.FC<ContentFilterBarProps> = ({
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts,
  className,
}) => {
  const filters = [
    { id: "all", label: "Semua", count: counts.all },
    { id: "draft", label: "Draft", count: counts.draft },
    { id: "published", label: "Terbit", count: counts.published },
    { id: "archived", label: "Arsip", count: counts.archived },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
        {filters.map((f) => {
          const isActive = currentFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-150",
                isActive
                  ? "bg-white text-navy shadow-sm"
                  : "text-slate-600 hover:text-navy"
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[0.6875rem] font-bold",
                  isActive
                    ? "bg-navy/10 text-navy"
                    : "bg-slate-200/80 text-slate-500"
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative min-w-[220px]">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari judul atau slug..."
          className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-navy placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>
    </div>
  );
};
