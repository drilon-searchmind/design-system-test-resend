"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Scroll distance (px) before the header collapses / expands again (hysteresis avoids flicker). */
const COMPACT_AFTER = 72;
const EXPAND_BEFORE = 36;

/** @param {HTMLElement | null} el */
function findScrollParent(el) {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Page header that sticks to the top of the workspace scroll area and collapses to a
 * compact bar (title + actions, e.g. the month picker) once the user scrolls down.
 * The wrapper keeps its original height while compact so the page content never jumps.
 *
 * Compact rules live in `globals.css` (`.sph*`): paragraphs inside the first child and
 * anything marked `.sph-hide` are hidden, the h1 is shrunk.
 *
 * @param {{ children: import('react').ReactNode; className?: string }} props
 */
export function StickyPageHeader({ children, className }) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const headerRef = useRef(/** @type {HTMLElement | null} */ (null));
  const stuckRef = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [lockedHeight, setLockedHeight] = useState(/** @type {number | null} */ (null));

  useEffect(() => {
    const scroller = findScrollParent(wrapRef.current);
    if (!scroller) return undefined;

    let raf = 0;
    const update = () => {
      raf = 0;
      const top = scroller.scrollTop;
      const next = stuckRef.current ? top > EXPAND_BEFORE : top > COMPACT_AFTER;
      if (next === stuckRef.current) return;
      if (next) setLockedHeight(wrapRef.current?.offsetHeight ?? null);
      stuckRef.current = next;
      setStuck(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      data-stuck={stuck}
      style={stuck && lockedHeight ? { minHeight: lockedHeight } : undefined}
      className="sph-wrap sticky top-0 z-30 data-[stuck=true]:pointer-events-none"
    >
      <header
        ref={headerRef}
        data-stuck={stuck}
        className={cn("sph pointer-events-auto relative isolate", className)}
      >
        {children}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 -z-10 border-b border-border bg-canvas/95 opacity-0 shadow-sm backdrop-blur transition-opacity duration-150",
            "-inset-x-[var(--ds-studio-pad-main)] md:-inset-x-[var(--ds-studio-pad-main-md)]",
            stuck && "opacity-100",
          )}
        />
      </header>
    </div>
  );
}
