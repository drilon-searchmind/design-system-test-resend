"use client";

import { createPortal } from "react-dom";
import { useCallback, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{
 *   children: import('react').ReactNode;
 *   title?: string;
 *   content: import('react').ReactNode;
 *   className?: string;
 *   triggerClassName?: string;
 *   align?: 'start' | 'center';
 * }} props
 */
export function CrmHoverPopover({
  children,
  title,
  content,
  className,
  triggerClassName,
  align = "center",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverId = useId();

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: align === "start" ? rect.left : rect.left + rect.width / 2,
    });
    setOpen(true);
  }, [align]);

  const hide = useCallback(() => setOpen(false), []);

  return (
    <span className={cn("inline-flex min-w-0 max-w-full", className)}>
      <span
        ref={triggerRef}
        className={cn(
          "inline-flex min-w-0 max-w-full cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-outline-accent",
          triggerClassName,
        )}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        aria-describedby={open ? popoverId : undefined}
      >
        {children}
      </span>
      {open && typeof document !== "undefined" ?
        createPortal(
          <div
            id={popoverId}
            role="tooltip"
            className="pointer-events-none fixed z-[200] w-[min(300px,calc(100vw-24px))] rounded-xl border border-border bg-canvas p-3 text-fg shadow-xl"
            style={{
              top: pos.top,
              left: pos.left,
              transform: align === "start" ? undefined : "translateX(-50%)",
            }}
          >
            {title ?
              <p className="text-[11px] font-semibold tracking-[-0.01em] text-fg">{title}</p>
            : null}
            <div className={cn(title && "mt-2")}>{content}</div>
          </div>,
          document.body,
        )
      : null}
    </span>
  );
}
