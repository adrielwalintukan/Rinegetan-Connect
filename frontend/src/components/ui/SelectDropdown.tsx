"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  badge?: string;
}

export interface SelectDropdownProps {
  id?: string;
  name?: string;
  label?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  helperText?: string;
}

/**
 * Reusable, accessible popover dropdown with auto-flip positioning
 * to prevent overflow on mobile dialogs and viewport edges.
 */
export function SelectDropdown({
  id,
  name,
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Pilih opsi...",
  className = "",
  helperText,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Find the active selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Determine auto-flip direction based on viewport space
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedMenuHeight = Math.min(options.length * 40 + 16, 230);
    // If not enough room below (less than menu height + 20px margin), flip upwards
    setOpenUpwards(spaceBelow < estimatedMenuHeight + 20);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
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

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for standard form compliance */}
      {name && <input type="hidden" name={name} value={String(value ?? "")} />}

      <div className="relative mt-1">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex min-h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs text-navy transition focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
            isOpen ? "border-navy ring-1 ring-navy shadow-sm" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="truncate text-left font-medium">
            {selectedOption ? (
              <span className="text-navy">{selectedOption.label}</span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-navy" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            role="listbox"
            tabIndex={-1}
            className={`absolute left-0 right-0 z-[70] max-h-56 w-full overflow-y-auto rounded-xl border border-navy/10 bg-white p-1.5 shadow-2xl transition-all ${
              openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
          >
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <div
                  key={String(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                    isSelected
                      ? "bg-navy-50 font-semibold text-navy"
                      : "text-slate-700 hover:bg-slate-50 hover:text-navy"
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 text-[11px] text-slate-400 font-normal">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {helperText && <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
};
