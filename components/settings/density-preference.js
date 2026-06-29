"use client";

import { setStoredDensity, useDensity } from "@/components/theme/use-density";

import { cn } from "@/lib/utils";

/** DESIGN.md §10.6 · compact default, spacious for larger touch targets / breathing room */

export function DensityPreference() {
  const density = useDensity();

  return (
    <div className="max-w-lg tally-panel p-6">
      <h2 className="font-sans text-base font-semibold text-fg">Layout density</h2>
      <p className="mt-2 font-sans text-sm text-fg-muted">
        Searchmind Agency OS uses compact spacing by default. Spacious increases padding on
        dashboard routes (DESIGN.md §10).
      </p>
      <div className="mt-4 inline-flex rounded-full border border-border p-0.5">
        <button
          type="button"
          className={cn(
            "rounded-full px-4 py-2 font-sans text-sm font-medium transition",
            density === "compact"
              ? "bg-surface-active text-fg"
              : "text-fg-muted hover:text-fg",
          )}
          aria-pressed={density === "compact"}
          onClick={() => setStoredDensity("compact")}
        >
          Compact
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full px-4 py-2 font-sans text-sm font-medium transition",
            density === "spacious"
              ? "bg-surface-active text-fg"
              : "text-fg-muted hover:text-fg",
          )}
          aria-pressed={density === "spacious"}
          onClick={() => setStoredDensity("spacious")}
        >
          Spacious
        </button>
      </div>
    </div>
  );
}
