"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   options: Array<{ id: string; label: string; prefix?: string }>;
 *   selected: Set<string>;
 *   onChange: (next: Set<string>) => void;
 *   emptyLabel?: string;
 *   allSelectedLabel?: string;
 *   countLabel?: (n: number) => string;
 *   icon?: import("react").ReactNode;
 *   className?: string;
 * }} props
 */
export function KbMultiSelectFilter({
  options,
  selected,
  onChange,
  emptyLabel = "Ingen valgt",
  allSelectedLabel = "Alle",
  countLabel = (n) => `${n} valgt`,
  icon = null,
  className,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const allKeys = useMemo(() => new Set(options.map((o) => o.id)), [options]);

  useEffect(() => {
    if (!open) return;

    function onDoc(e) {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const triggerLabel = useMemo(() => {
    if (selected.size === 0) return emptyLabel;
    if (selected.size === allKeys.size) return allSelectedLabel;
    if (selected.size === 1) {
      const only = [...selected][0];
      return options.find((o) => o.id === only)?.label ?? only;
    }
    return countLabel(selected.size);
  }, [allKeys.size, countLabel, emptyLabel, allSelectedLabel, options, selected]);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(allKeys));
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full border px-3 font-sans text-[12px] font-medium transition-colors",
          selected.size > 0 && selected.size < allKeys.size ?
            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
          : "border-border bg-surface-muted text-fg-muted hover:border-border-strong hover:text-fg",
        )}
      >
        {icon}
        <span className="truncate">{triggerLabel}</span>
        <PulseIconChevronDown size={10} className={cn("shrink-0 opacity-70 transition", open && "rotate-180")} />
      </button>

      {open ?
        <div
          ref={menuRef}
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(260px,calc(100vw-2rem))] rounded-xl border border-border bg-canvas p-2 shadow-xl"
        >
          <div className="mb-2 flex flex-wrap gap-1 border-b border-border-soft px-1 pb-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md px-2 py-1 font-sans text-[11px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Vælg alle
            </button>
          </div>
          <ul
            className="max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-multiselectable="true"
          >
            {options.map((opt) => {
              const checked = selected.has(opt.id);
              return (
                <li key={opt.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted",
                      checked && "bg-surface-muted/80",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.id)}
                      className="size-3.5 shrink-0 rounded border-border accent-agency-brand"
                    />
                    {opt.prefix ?
                      <span className="text-base leading-none">{opt.prefix}</span>
                    : null}
                    <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-fg">{opt.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      : null}
    </div>
  );
}

/**
 * @param {Set<string>} selected
 * @param {Set<string>} allKeys
 */
export function kbMatchesMultiFilter(value, selected, allKeys) {
  if (selected.size === 0) return false;
  if (selected.size === allKeys.size) return true;
  return selected.has(value);
}

/**
 * @param {string[]} articleTags
 * @param {Set<string>} selected
 * @param {Set<string>} allTagKeys
 */
export function kbMatchesTagFilter(articleTags, selected, allTagKeys) {
  if (allTagKeys.size === 0) return true;
  if (selected.size === 0) return false;
  if (selected.size === allTagKeys.size) return true;
  return articleTags.some((t) => selected.has(t));
}
