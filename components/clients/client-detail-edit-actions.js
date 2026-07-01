"use client";

import { cn } from "@/lib/utils";

export const clientEditInputClass = cn(
  "h-10 w-full rounded-lg border border-border bg-surface-muted px-3",
  "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
);

export const clientEditTextareaClass = cn(
  "min-h-[72px] w-full resize-y rounded-lg border border-border bg-surface-muted px-3 py-2",
  "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
);

/**
 * @param {{
 *   editing: boolean;
 *   saving: boolean;
 *   onEdit: () => void;
 *   onSave: () => void;
 *   onCancel: () => void;
 *   className?: string;
 * }} props
 */
export function ClientDetailEditActions({ editing, saving, onEdit, onSave, onCancel, className }) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "h-9 rounded-md border border-border px-3 font-sans text-[13px] font-medium text-fg",
          "transition-colors hover:bg-surface-muted",
          className,
        )}
      >
        Rediger
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="h-9 rounded-md border border-border px-3 font-sans text-[13px] text-fg-muted hover:bg-surface-muted disabled:opacity-50"
      >
        Annuller
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className={cn(
          "h-9 rounded-md px-4 font-sans text-[13px] font-medium text-white",
          "bg-agency-brand hover:opacity-90 disabled:opacity-40",
        )}
      >
        {saving ? "Gemmer…" : "Gem"}
      </button>
    </div>
  );
}
