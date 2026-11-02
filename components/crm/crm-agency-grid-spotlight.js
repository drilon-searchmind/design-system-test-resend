"use client";

import { useEffect, useRef } from "react";

/** Main scroll moves 1px; grid moves PARALLAX_RATE px (very slow drift). */
const PARALLAX_RATE = 0.14;

/**
 * Fixed grid spotlight with slow scroll parallax on the agency workspace canvas.
 * `variant="none"` (default) renders nothing; `variant="dots"` draws a dot at each grid intersection; `variant="lines"` is the original grid lines.
 * @param {{ scrollRef: import('react').RefObject<HTMLElement | null>; variant?: "dots" | "lines" | "none" }} props
 */
export function CrmAgencyGridSpotlight({ scrollRef, variant = "none" }) {
  const gridRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const gridEl = gridRef.current;
    if (!scrollEl || !gridEl) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      const offset = motionQuery.matches ? 0 : scrollEl.scrollTop * PARALLAX_RATE;
      gridEl.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    apply();
    scrollEl.addEventListener("scroll", apply, { passive: true });
    motionQuery.addEventListener("change", apply);

    return () => {
      scrollEl.removeEventListener("scroll", apply);
      motionQuery.removeEventListener("change", apply);
    };
  }, [scrollRef]);

  if (variant === "none") return null;

  return (
    <div
      ref={gridRef}
      className={`crm-agency-grid-spotlight${variant === "dots" ? " crm-agency-grid-spotlight--dots" : ""}`}
      aria-hidden
    />
  );
}
