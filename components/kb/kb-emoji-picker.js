"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { filterKbEmojiOptions } from "@/lib/crm/kb-emoji-options";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   value: string | null;
 *   onChange: (emoji: string | null) => void;
 *   disabled?: boolean;
 * }} props
 */
export function KbEmojiPicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const options = useMemo(() => filterKbEmojiOptions(query), [query]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!rootRef.current?.contains(/** @type {Node} */ (e.target))) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-2.5 font-sans text-[13px] text-fg",
          disabled && "opacity-50",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg leading-none">{value ?? "—"}</span>
          <span className="text-[11px] text-fg-muted">{value ? "Valgt ikon" : "Vælg ikon"}</span>
        </span>
        <span className="text-fg-quiet" aria-hidden>
          ▾
        </span>
      </button>

      {open ?
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-canvas p-2 shadow-lg">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg emoji…"
            autoFocus
            className="mb-2 h-8 w-full rounded-md border border-border bg-surface-card px-2 font-sans text-[12px] text-fg outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {options.map((opt) => (
                <button
                  key={opt.emoji}
                  type="button"
                  title={opt.keywords}
                  onClick={() => {
                    onChange(opt.emoji);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-lg hover:bg-surface-muted",
                    value === opt.emoji && "bg-agency-brand-soft ring-1 ring-agency-brand-border",
                  )}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
            {options.length === 0 ?
              <p className="px-2 py-3 text-center font-sans text-[11px] text-fg-muted">Ingen emoji fundet</p>
            : null}
          </div>
          {value ?
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md border border-border-soft px-2 py-1 font-sans text-[11px] text-fg-muted hover:bg-surface-muted"
            >
              Fjern ikon
            </button>
          : null}
        </div>
      : null}
    </div>
  );
}
