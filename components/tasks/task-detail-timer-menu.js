"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTimerModal } from "@/components/crm/timer-modal-context";
import { IconClock } from "@/components/crm/icons";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { startTimerForTask } from "@/lib/crm/timer-client";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   clientSlug: string;
 *   taskKey: string;
 *   taskTitle?: string;
 *   billable?: boolean;
 *   disabled?: boolean;
 *   className?: string;
 * }} props
 */
export function TaskDetailTimerMenu({
  clientSlug,
  taskKey,
  taskTitle = "",
  billable = true,
  disabled = false,
  className,
}) {
  const { openTimer } = useTimerModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const canRun = Boolean(clientSlug.trim() && taskKey.trim()) && !disabled && !busy;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  }, [disabled]);

  const closeMenu = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 150);
  }, []);

  const handleStartTimer = useCallback(async () => {
    if (!canRun) return;
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try {
      await startTimerForTask({
        clientSlug: clientSlug.trim(),
        taskKey: taskKey.trim(),
        description: taskTitle.trim(),
        billable,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke starte timer");
    } finally {
      setBusy(false);
    }
  }, [canRun, clientSlug, taskKey, taskTitle, billable]);

  const handleManualRegister = useCallback(() => {
    if (disabled) return;
    setMenuOpen(false);
    openTimer({
      clientSlug: clientSlug.trim(),
      taskKey: taskKey.trim(),
      trackMode: "manual",
      billable,
    });
  }, [billable, clientSlug, disabled, openTimer, taskKey]);

  return (
    <div className={cn("relative flex flex-col items-end gap-1", className)}>
      <div
        className={cn("relative", disabled && "pointer-events-none opacity-50")}
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        onFocus={openMenu}
        onBlur={(e) => {
          if (!e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget))) {
            closeMenu();
          }
        }}
      >
        <button
          type="button"
          disabled={!canRun}
          onClick={() => void handleStartTimer()}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-sans text-[13px] font-medium transition-colors",
            "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
            "hover:bg-agency-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <IconClock size={14} className="shrink-0" />
          {busy ? "Starter…" : "Start timer"}
          <PulseIconChevronDown
            size={10}
            className={cn("shrink-0 opacity-70 transition", menuOpen && "rotate-180")}
          />
        </button>

        {/* pt-1 bridges the gap so the pointer never leaves the hover target */}
        <div
          className={cn(
            "absolute right-0 top-full z-40 min-w-[200px] pt-1 transition",
            menuOpen ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0",
          )}
          role="menu"
        >
          <div className="rounded-xl border border-border bg-canvas p-1 shadow-xl">
            <button
              type="button"
              role="menuitem"
              disabled={!canRun}
              onClick={() => void handleStartTimer()}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-sans text-[12px] font-medium",
                "text-fg hover:bg-surface-muted disabled:opacity-50",
              )}
            >
              <IconClock size={14} className="shrink-0 text-agency-brand" />
              Start timer
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={disabled || busy}
              onClick={handleManualRegister}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-sans text-[12px] font-medium",
                "text-fg hover:bg-surface-muted disabled:opacity-50",
              )}
            >
              <span className="flex size-[14px] shrink-0 items-center justify-center text-[11px] font-bold text-agency-brand">
                +
              </span>
              Manuel registrering
            </button>
          </div>
        </div>
      </div>
      {error ?
        <p className="max-w-[220px] text-right font-sans text-[10px] text-agency-bad">{error}</p>
      : null}
    </div>
  );
}
