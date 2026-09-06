"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

const INITIAL_COUNT = 5;
const TYPING_COUNT = 8;

/**
 * Psych-battery-styled sibling of the classic admin panel's SearchCombobox
 * (src/components/admin/SearchCombobox.tsx) — same behavior, restyled to
 * match this module's Tailwind/glass design system instead of the legacy
 * admin theme. Focusing an empty field opens a dropdown of the 5 most recent
 * real values for it (e.g. the 5 most recently added chest numbers), passed
 * in via `options` (newest-first — see src/lib/latestValues.ts). Typing
 * narrows the dropdown to live-matching values from the full list.
 */
export default function SearchCombobox({
  value,
  onChange,
  placeholder,
  options,
  className,
  containerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Distinct field values, newest-first. See latestDistinctValues(). */
  options: string[];
  className?: string;
  containerClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = q
    ? options.filter((o) => o.toLowerCase().includes(q)).slice(0, TYPING_COUNT)
    : options.slice(0, INITIAL_COUNT);

  return (
    <div ref={containerRef} className={cn("relative flex-1", containerClassName)}>
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
      <input
        type="text"
        className={cn(
          "w-full bg-app-card border border-app-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-app-text-bright placeholder-app-text-muted",
          "focus:outline-none focus:border-app-accent/50 focus:ring-2 focus:ring-app-accent/15 transition-all",
          className
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") setIsOpen(false);
        }}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-app-card border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setIsOpen(false);
              }}
              className="block w-full text-left px-3.5 py-2 text-xs font-medium text-app-text-bright hover:bg-app-accent/10 transition-colors truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
