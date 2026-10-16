"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";

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

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Converts any ISO timestamp or date string into valid YYYY-MM-DDTHH:mm for datetime-local input.
 * Accurately shifts UTC into Asia/Makassar (+08:00 WITA).
 */
export function toDateTimeLocalValue(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const trimmed = String(isoString).trim();
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

function parseDateTimeState(value: string, type: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day: number | null = null;
  let hour = "09";
  let minute = "00";

  if (value) {
    try {
      if (type === "time") {
        const parts = value.split(":");
        if (parts[0]) hour = parts[0].padStart(2, "0");
        if (parts[1]) minute = parts[1].slice(0, 2).padStart(2, "0");
      } else {
        const clean = value.replace(/([+-]\d{2}:\d{2}|Z)$/, "");
        const [dPart, tPart] = clean.split("T");
        if (dPart) {
          const [y, m, d] = dPart.split("-").map(Number);
          if (y && m && d) {
            year = y;
            month = m - 1;
            day = d;
          }
        }
        if (tPart) {
          const [h, min] = tPart.split(":");
          if (h) hour = h.padStart(2, "0");
          if (min) minute = min.slice(0, 2).padStart(2, "0");
        }
      }
    } catch {
      // ignore parse error
    }
  }

  return { year, month, day, hour, minute };
}

function formatDisplayValue(val: string, type: "datetime-local" | "date" | "time"): string {
  if (!val) return "";
  try {
    if (type === "time") {
      const match = val.match(/^(\d{1,2}):(\d{2})/);
      return match ? `${match[1].padStart(2, "0")}:${match[2]} WITA` : val;
    }
    const clean = val.replace(/([+-]\d{2}:\d{2}|Z)$/, "");
    const parts = clean.split("T");
    const datePart = parts[0];
    const timePart = parts[1] || "";
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return val;
    const monthStr = MONTH_NAMES[m - 1]?.slice(0, 3) || "";
    const dateStr = `${d} ${monthStr} ${y}`;
    if (type === "date" || !timePart) return dateStr;
    const timeClean = timePart.slice(0, 5);
    return `${dateStr}, ${timeClean} WITA`;
  } catch {
    return val;
  }
}

/**
 * Reusable mobile-first Date & Time picker component.
 * Uses a custom responsive popup that stays strictly within the modal boundaries,
 * with auto-flip upwards when near the bottom of the viewport.
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
  placeholder,
  className = "",
  helperText,
  badge = "WITA",
}: DateTimeInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Parse state from value prop (derived, no useEffect setState)
  const parsed = parseDateTimeState(value, type);

  // Month navigation override state when browsing other months
  const [navYear, setNavYear] = useState<number | null>(null);
  const [navMonth, setNavMonth] = useState<number | null>(null);

  const viewYear = navYear ?? parsed.year;
  const viewMonth = navMonth ?? parsed.month;
  const selectedDay = parsed.day;
  const selectedHour = parsed.hour;
  const selectedMinute = parsed.minute;

  // Determine auto-flip direction based on viewport space
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = type === "time" ? 220 : 340;
    setOpenUpwards(spaceBelow < estimatedHeight + 20);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on click outside and escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const emitChange = (newVal: string) => {
    const syntheticEvent = {
      target: { name, value: newVal },
      currentTarget: { name, value: newVal },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleDayClick = (day: number) => {
    const y = String(viewYear);
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setNavYear(null);
    setNavMonth(null);

    if (type === "date") {
      emitChange(`${y}-${m}-${d}`);
      setIsOpen(false);
    } else {
      // datetime-local
      const newVal = `${y}-${m}-${d}T${selectedHour}:${selectedMinute}`;
      emitChange(newVal);
    }
  };

  const handleTimeChange = (newHour: string, newMinute: string) => {
    if (type === "time") {
      emitChange(`${newHour}:${newMinute}`);
    } else if (type === "datetime-local") {
      const y = String(viewYear);
      const m = String(viewMonth + 1).padStart(2, "0");
      const d = String(selectedDay ?? new Date().getDate()).padStart(2, "0");
      const newVal = `${y}-${m}-${d}T${newHour}:${newMinute}`;
      emitChange(newVal);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setNavYear(null);
    setNavMonth(null);

    if (type === "date") {
      emitChange(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      setIsOpen(false);
    } else if (type === "datetime-local") {
      const newVal = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}T${selectedHour}:${selectedMinute}`;
      emitChange(newVal);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setNavMonth(11);
      setNavYear(viewYear - 1);
    } else {
      setNavMonth(viewMonth - 1);
      setNavYear(viewYear);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setNavMonth(0);
      setNavYear(viewYear + 1);
    } else {
      setNavMonth(viewMonth + 1);
      setNavYear(viewYear);
    }
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const Icon = type === "time" ? Clock : Calendar;
  const displayFormatted = formatDisplayValue(value, type);

  // Common hours (00-23) & minutes (every 5 mins or select)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div className={`relative w-full ${className}`}>
      {/* Label & Badge */}
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

      {/* Hidden standard input for form serialization */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger Button */}
      <div className="relative mt-1">
        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`flex min-h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs text-navy transition focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
            isOpen ? "border-navy ring-1 ring-navy shadow-sm" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center min-w-0 pr-2">
            <Icon className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate text-left font-medium">
              {displayFormatted ? (
                <span className="text-navy">{displayFormatted}</span>
              ) : (
                <span className="text-slate-400">
                  {placeholder || (type === "time" ? "Pilih jam ibadah..." : "Pilih tanggal & waktu...")}
                </span>
              )}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-navy" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Custom DateTime Popover: Contained within card/viewport */}
        {isOpen && (
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="false"
            className={`absolute left-0 right-0 z-[75] w-full max-w-[340px] rounded-2xl border border-navy/10 bg-white p-4 shadow-2xl transition-all ${
              openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
          >
            {/* DATE SECTION */}
            {type !== "time" && (
              <div>
                {/* Month/Year Navigation */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy transition"
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-navy">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy transition"
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                  {DAY_NAMES.map((d, idx) => (
                    <span key={d} className={idx === 6 ? "text-amber-700" : ""}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {/* Empty lead cells */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isSelected =
                      selectedDay === day &&
                      parsed.month === viewMonth &&
                      parsed.year === viewYear;
                    const isSaturday = (firstDayIndex + day - 1) % 7 === 6;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? "bg-navy text-white shadow-sm"
                            : isSaturday
                            ? "text-amber-700 hover:bg-amber-50"
                            : "text-slate-700 hover:bg-slate-100 hover:text-navy"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TIME SECTION */}
            {type !== "date" && (
              <div className={`${type !== "time" ? "mt-3 pt-3 border-t border-slate-100" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-700">Waktu (WITA)</span>
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    WITA (UTC+8)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Hour Selector */}
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Jam</label>
                    <select
                      value={selectedHour}
                      onChange={(e) => handleTimeChange(e.target.value, selectedMinute)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-navy focus:border-navy focus:outline-none"
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="mt-4 text-slate-400 font-bold">:</span>

                  {/* Minute Selector */}
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Menit</label>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimeChange(selectedHour, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-navy focus:border-navy focus:outline-none"
                    >
                      {minutes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Common Presets for Routine Schedules */}
                {type === "time" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["08:45", "09:00", "10:30", "18:00"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const [h, m] = preset.split(":");
                          handleTimeChange(h, m);
                        }}
                        className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                          `${selectedHour}:${selectedMinute}` === preset
                            ? "border-navy bg-navy text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {preset} WITA
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              {type !== "time" ? (
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                >
                  Hari Ini
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy/90 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {helperText && <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
}
