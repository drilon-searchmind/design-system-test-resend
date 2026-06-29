"use client";

import { useMemo } from "react";

import { formatColorTokenLabel, resolveColorTokenCss } from "@/lib/crm/color-tokens";

/** @param {{ token: unknown }} props */
export function AdminColorTokenCell({ token }) {
  const label = formatColorTokenLabel(token ? String(token) : null);
  const bg = useMemo(() => resolveColorTokenCss(token ? String(token) : null), [token]);

  if (!token) return <span className="text-fg-quiet">—</span>;

  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-sm border border-border"
        style={{ background: bg ?? "var(--ds-surface-muted)" }}
        aria-hidden
      />
      <span className="truncate text-[11px] tabular-nums text-fg-muted">{label}</span>
    </span>
  );
}
