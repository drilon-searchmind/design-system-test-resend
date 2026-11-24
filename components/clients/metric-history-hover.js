"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @typedef {'retainer' | 'nps' | 'margin'} MetricKey
 * @typedef {{ label: string; value: number | null }} TrendPoint
 */

/** @type {Record<MetricKey, string>} */
const TITLES = {
  retainer: "Retainer",
  nps: "NPS",
  margin: "Margin",
};

const CHART_W = 264;
const CHART_H = 96;
const PAD_Y = 6;

/** @param {TrendPoint[]} points @param {(v: number) => string} format */
function TrendChart({ points, format }) {
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
 * Lazy 12-måneders historik ved hover (kun Retainer + NPS) i kundelisten.
 * Henter data ved første hover og viser grafen med det samme (også mens fetch kører færdig).
 *
 * @param {{
 *   clientId: string;
 *   metric: MetricKey;
 *   children: import('react').ReactNode;
 *   className?: string;
 *   currency?: string;
 * }} props
 */
export function MetricHistoryHover({ clientId, metric, children, className, currency = "DKK" }) {
  const dataSource = useDataSource();
  const [points, setPoints] = useState(/** @type {TrendPoint[] | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const tried = useRef(false);
  const hovering = useRef(false);
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const id = useId();

  const usable = (points ?? []).filter((p) => typeof p.value === "number" && Number.isFinite(p.value));
  const canChart = usable.length >= 2;

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = CHART_W + 26;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const top = below + 190 > window.innerHeight ? Math.max(12, rect.top - 198) : below;
    setPos({ top, left });
  }, []);

  const load = useCallback(async () => {
    if (tried.current || dataSource === "demo") return;
    tried.current = true;
    setLoading(true);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/trends?${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPoints([]);
        return;
      }
      const raw =
        metric === "retainer" ? data.mrr
        : metric === "margin" ? data.margin
        : data.nps;
      setPoints(Array.isArray(raw) ? raw : []);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, dataSource, metric]);

  // When points arrive while still hovering, open the chart.
  useEffect(() => {
    if (!hovering.current || !canChart) return;
    place();
    setOpen(true);
  }, [canChart, points, place]);

  const onEnter = () => {
    if (dataSource === "demo") return;
    hovering.current = true;
    place();
    setOpen(true);
    void load();
  };

  const onLeave = () => {
    hovering.current = false;
    setOpen(false);
  };

  const format =
    metric === "retainer" ? (v) => formatCurrencyCompact(v, currency)
    : metric === "margin" ? (v) => formatPercent(v)
    : (v) => String(Math.round(v));

  const showHint = dataSource !== "demo";

  return (
    <div
      ref={ref}
      className={cn(showHint && "cursor-help decoration-dotted underline-offset-2 hover:underline", className)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      title={showHint ? `${TITLES[metric]} · hover for 12 mdr. historik` : undefined}
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
            <p className="mb-2 text-[11px] font-semibold tracking-[-0.01em] text-fg">
              {TITLES[metric]} · seneste 12 mdr.
            </p>
            {canChart ?
              <TrendChart points={points ?? []} format={format} />
            : loading || points == null ?
              <p className="py-6 text-center text-[12px] text-fg-quiet">Henter historik…</p>
            : <p className="py-6 text-center text-[12px] text-fg-quiet">Ikke nok historik endnu</p>}
          </div>,
          document.body,
        )
      : null}
    </div>
  );
}
