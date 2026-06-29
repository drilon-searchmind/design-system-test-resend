"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Modal dialog — Tally surface (light card, flat border).
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   ariaLabel: string;
 *   children: import("react").ReactNode;
 *   className?: string;
 *   maxWidthClass?: string;
 * }} props
 */
export function CrmDialog({
  open,
  onClose,
  ariaLabel,
  children,
  className,
  maxWidthClass = "w-[min(100vw-1.5rem,640px)]",
}) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[120] max-w-full -translate-x-1/2 -translate-y-1/2",
        maxWidthClass,
        "tally-panel max-h-[min(92vh,920px)] overflow-hidden p-0",
        "backdrop:bg-fg/10 backdrop:backdrop-blur-[2px]",
        className,
      )}
      aria-label={ariaLabel}
      onClose={onClose}
    >
      {children}
    </dialog>
  );
}
