"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";

const INITIAL_COUNT = 5;
const TYPING_COUNT = 8;

/**
 * Drop-in replacement for the plain "search + icon" input repeated across
 * every admin list page. Adds a country-picker-style combobox: focusing the
 * (empty) field opens a dropdown of the 5 most recent real values for this
 * field (e.g. the 5 most recently created batch numbers) — passed in via
 * `options`, already sorted newest-first by the caller (see
 * src/lib/latestValues.ts). Typing narrows the dropdown to live-matching
 * values from the full `options` list (not just the initial 5) while still
 * driving the underlying table's own filtering exactly as before (onChange
 * fires on every keystroke, unchanged). Picking a suggestion fills the field
 * with that exact value.
 */
export default function SearchCombobox({
  value,
  onChange,
  placeholder,
  options,
  maxWidth = 400,
  className = "admin-input",
  inputStyle,
  wrapperClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Distinct field values, newest-first. See latestDistinctValues(). */
  options: string[];
  maxWidth?: number | "none";
  className?: string;
  inputStyle?: CSSProperties;
  wrapperClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = q
    ? options.filter((o) => o.toLowerCase().includes(q)).slice(0, TYPING_COUNT)
    : options.slice(0, INITIAL_COUNT);

  return (
    <div ref={containerRef} className={wrapperClassName} style={{ position: "relative", maxWidth: maxWidth === "none" ? undefined : maxWidth, width: "100%" }}>
      <Search size={16} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        style={{ paddingLeft: 45, ...inputStyle }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") setIsOpen(false);
        }}
      />
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--surface-dark, #1a1a1a)",
            border: "var(--border-glass, 1px solid rgba(255,255,255,0.08))",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setIsOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                color: "var(--text-white, #fff)",
                fontSize: "0.85rem",
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
