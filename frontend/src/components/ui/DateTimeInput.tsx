"use client";

import React, { useId } from "react";
import { Calendar, Clock } from "lucide-react";

export interface DateTimeInputProps {
  id?: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "datetime-local" | "date" | "time";
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  helperText?: string;
  badge?: string;
}

/**
 * Converts any ISO timestamp or date string into valid YYYY-MM-DDTHH:mm for datetime-local input.
 * Accurately shifts UTC into Asia/Makassar (+08:00 WITA).
 */
export function toDateTimeLocalValue(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const trimmed = String(isoString).trim();
    // If it's already YYYY-MM-DDTHH:mm without seconds or timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return "";
    // Shift UTC time by +8 hours (WITA)
    const witaMs = d.getTime() + 8 * 3600 * 1000;
    const witaDate = new Date(witaMs);
    const yyyy = witaDate.getUTCFullYear();
    const mm = String(witaDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(witaDate.getUTCDate()).padStart(2, "0");
    const hh = String(witaDate.getUTCHours()).padStart(2, "0");
    const min = String(witaDate.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return "";
  }
}

/**
 * Reusable mobile-first Date & Time input with full-width responsive containment
 * and visual icons to prevent modal overflowing.
 */
export function DateTimeInput({
  id,
  name,
  label,
  value,
  onChange,
  type = "datetime-local",
  required = false,
  disabled = false,
  min,
  max,
  className = "",
  helperText,
  badge = "WITA",
}: DateTimeInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const Icon = type === "time" ? Clock : Calendar;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {badge && (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
            {badge}
          </span>
        )}
      </div>

      <div className="relative mt-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          className="block min-h-[42px] w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-navy transition focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
        />
      </div>

      {helperText && <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
};
