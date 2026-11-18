"use client";

import { useTimerModal } from "@/components/crm/timer-modal-context";
import { IconClock } from "@/components/crm/icons";
import { cn } from "@/lib/utils";

/**
 * Opens manual time registration prefilled with this task.
 * @param {{
 *   clientSlug: string;
 *   taskKey: string;
 *   billable?: boolean;
 *   disabled?: boolean;
 *   disabledHint?: string;
 *   className?: string;
 * }} props
 */
export function TaskDetailTimeButton({
  clientSlug,
  taskKey,
  billable = true,
  disabled = false,
  disabledHint = "",
  className,
}) {
  const { openTimer } = useTimerModal();
  const canOpen = Boolean(clientSlug.trim() && taskKey.trim()) && !disabled;

  return (
    <button
      type="button"
      disabled={!canOpen}
      title={canOpen ? "Registrér timer på opgaven" : disabledHint || undefined}
      onClick={() =>
        openTimer({
          clientSlug: clientSlug.trim(),
          taskKey: taskKey.trim(),
          trackMode: "manual",
          billable,
        })
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-sans text-[13px] font-medium transition-colors",
        "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
        "hover:bg-agency-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        "disabled:hover:bg-agency-brand-soft disabled:hover:text-agency-brand",
        className,
      )}
    >
      <IconClock size={14} className="shrink-0" />
      Timer
    </button>
  );
}
