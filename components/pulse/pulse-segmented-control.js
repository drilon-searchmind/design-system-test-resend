"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented control — DESIGN-SEARCHMINDOS `<TabGroup>`.
 * @param {{
 *   tabs: { id: string; label: string; count?: number; icon?: () => import('react').ReactNode }[];
 *   active: string;
 *   onChange: (id: string) => void;
 *   size?: 'sm' | 'md';
 *   className?: string;
 * }} props
 */
export function PulseSegmentedControl({ tabs, active, onChange, size = "md", className }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full flex-wrap rounded-full border border-border bg-surface-muted p-0.5",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[12px]",
              isActive
                ? "bg-canvas text-fg"
                : "text-fg-muted hover:bg-surface-active hover:text-fg",
            )}
          >
            {t.icon ? <span className="inline-flex opacity-90">{t.icon()}</span> : null}
            {t.label ? <span>{t.label}</span> : null}
            {t.count != null ? (
              <span className="text-[10px] tabular-nums text-fg-quiet">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
