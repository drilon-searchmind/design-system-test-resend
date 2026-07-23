"use client";

import { useEffect, useRef } from "react";

/** Main scroll moves 1px; grid moves PARALLAX_RATE px (very slow drift). */
const PARALLAX_RATE = 0.14;

/**
 * Fixed grid spotlight with slow scroll parallax on the agency workspace canvas.
 * @param {{ scrollRef: import('react').RefObject<HTMLElement | null> }} props
 */
export function CrmAgencyGridSpotlight({ scrollRef }) {
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

  return <div ref={gridRef} className="crm-agency-grid-spotlight" aria-hidden />;
}
