"use client";

import { useMemo, useState } from "react";

import { isSystemKnowledgeTag } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   value: string[];
 *   onChange: (tags: string[]) => void;
 *   suggestions: string[];
 *   disabled?: boolean;
 * }} props
 */
export function KbTagPicker({ value, onChange, suggestions, disabled = false }) {
  const [query, setQuery] = useState("");

  const selected = useMemo(() => value.filter((t) => !isSystemKnowledgeTag(t)), [value]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedSet = new Set(selected.map((t) => t.toLowerCase()));
    return suggestions
      .filter((t) => !isSystemKnowledgeTag(t))
      .filter((t) => !selectedSet.has(t.toLowerCase()))
      .filter((t) => !q || t.toLowerCase().includes(q));
  }, [query, selected, suggestions]);

  const canCreate =
    query.trim().length > 0 &&
    !selected.some((t) => t.toLowerCase() === query.trim().toLowerCase()) &&
    !isSystemKnowledgeTag(query.trim());

  function addTag(tag) {
    const t = tag.trim();
    if (!t || isSystemKnowledgeTag(t)) return;
    if (selected.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...selected, t]);
    setQuery("");
  }

  function removeTag(tag) {
    onChange(selected.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 ?
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-md border border-border-soft bg-surface-muted px-2 py-0.5 font-sans text-[11px] text-fg">
                {tag}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeTag(tag)}
                  className="text-fg-quiet hover:text-fg"
                  aria-label={`Fjern tag ${tag}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      : null}

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canCreate) addTag(query);
              else if (available[0]) addTag(available[0]);
            }
          }}
          placeholder="Søg eller opret tag…"
          className="h-8 w-full rounded-md border border-border bg-surface-card px-2 font-sans text-[12px] text-fg"
        />

        {query.trim() && (available.length > 0 || canCreate) ?
          <ul className="absolute left-0 right-0 z-10 mt-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-canvas py-1 shadow-md">
            {available.slice(0, 8).map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => addTag(tag)}
                  className="block w-full px-3 py-1.5 text-left font-sans text-[12px] text-fg hover:bg-surface-muted"
                >
                  {tag}
                </button>
              </li>
            ))}
            {canCreate ?
              <li>
                <button
                  type="button"
                  onClick={() => addTag(query)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left font-sans text-[12px] text-agency-brand hover:bg-surface-muted",
                  )}
                >
                  Opret tag «{query.trim()}»
                </button>
              </li>
            : null}
          </ul>
        : null}
      </div>
    </div>
  );
}
