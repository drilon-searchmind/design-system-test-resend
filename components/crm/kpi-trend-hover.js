"use client";

import { createPortal } from "react-dom";
import { useCallback, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @typedef {{ label: string; value: number | null }} KpiTrendPoint
 */

const CHART_W = 264;
const CHART_H = 96;
const PAD_Y = 6;

/** @param {number} v */
function defaultFormat(v) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(v);
}

/**
 * Bar chart of up to 12 monthly points (last bar = current month, highlighted).
 * @param {{ points: KpiTrendPoint[]; format: (v: number) => string }} props
 */
function KpiTrendChart({ points, format }) {
  const values = points.map((p) => (typeof p.value === "number" && Number.isFinite(p.value) ? p.value : null));
  const nums = values.filter((v) => v != null);
  const max = nums.length ? Math.max(...nums, 0) : 0;
  const min = nums.length ? Math.min(...nums, 0) : 0;
  const span = max - min || 1;
  const slot = CHART_W / Math.max(points.length, 1);
  const barW = Math.max(4, slot - 6);
  const zeroY = PAD_Y + ((max - 0) / span) * (CHART_H - PAD_Y * 2);

  const first = nums[0];
  const last = values[values.length - 1];

  return (
    <div>
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-hidden>
        <line x1={0} x2={CHART_W} y1={zeroY} y2={zeroY} className="stroke-border" strokeWidth={1} />
        {values.map((v, i) => {
          if (v == null) return null;
          const y = PAD_Y + ((max - v) / span) * (CHART_H - PAD_Y * 2);
          const top = Math.min(y, zeroY);
          const h = Math.max(1.5, Math.abs(zeroY - y));
          const isLast = i === values.length - 1;
          return (
            <rect
              key={points[i].label}
              x={i * slot + (slot - barW) / 2}
              y={top}
              width={barW}
              height={h}
              rx={2}
              className={isLast ? "fill-agency-brand" : "fill-agency-brand-border"}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-fg-quiet">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
      <div className="mt-2 flex justify-between gap-3 border-t border-border pt-2 text-[11px] tabular-nums text-fg-muted">
        <span>Højeste: {nums.length ? format(Math.max(...nums)) : "–"}</span>
        <span>
          Nu: <span className="font-semibold text-fg">{last != null ? format(last) : "–"}</span>
          {first != null && last != null && first !== 0 ?
            <span className="ml-1 text-fg-quiet">
              ({last >= first ? "+" : ""}
              {Math.round(((last - first) / Math.abs(first)) * 100)}% over perioden)
            </span>
          : null}
        </span>
      </div>
    </div>
  );
}

/**
 * Wraps a KPI box: hovering (or focusing) shows a 12-month trend chart.
 * Renders children unchanged when there are fewer than 2 points with data.
 * @param {{
 *   children: import('react').ReactNode;
 *   title: string;
 *   points: KpiTrendPoint[] | null | undefined;
 *   format?: (v: number) => string;
 *   className?: string;
 * }} props
 */
export function KpiTrendHover({ children, title, points, format = defaultFormat, className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const id = useId();

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = CHART_W + 26;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const top = below + 190 > window.innerHeight ? Math.max(12, rect.top - 198) : below;
    setPos({ top, left });
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  const usable = (points ?? []).filter((p) => typeof p.value === "number" && Number.isFinite(p.value));
  if (!points || usable.length < 2) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && typeof document !== "undefined" ?
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[200] rounded-xl border border-border bg-canvas p-3 text-fg shadow-xl"
            style={{ top: pos.top, left: pos.left, width: CHART_W + 26 }}
          >
            <p className="mb-2 text-[11px] font-semibold tracking-[-0.01em] text-fg">{title} · seneste 12 mdr.</p>
            <KpiTrendChart points={points} format={format} />
          </div>,
          document.body,
        )
      : null}
    </div>
  );
}