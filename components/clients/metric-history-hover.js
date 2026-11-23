"use client";

import { useCallback, useRef, useState } from "react";

import { KpiTrendHover } from "@/components/crm/kpi-trend-hover";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { useDataSource } from "@/components/crm/use-data-source";

/**
 * @typedef {'retainer' | 'margin' | 'nps' | 'indeks'} MetricKey
 */

/** @type {Record<MetricKey, string>} */
const TITLES = {
  retainer: "Retainer",
  margin: "Margin",
  nps: "NPS",
  indeks: "Indeks",
};

/**
 * Lazy 12-måneders historik ved hover. Henter trends første gang.
 * Margin/Indeks har begrænset historik i CRM i dag — viser det vi har.
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
  const [points, setPoints] = useState(/** @type {{ label: string; value: number | null }[] | null} */ (null));
  const [tried, setTried] = useState(false);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (tried || loading.current || dataSource === "demo") return;
    loading.current = true;
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
        : metric === "nps" ? data.nps
        : metric === "margin" ? data.margin
        : data.indeks;
      setPoints(Array.isArray(raw) ? raw : []);
    } catch {
      setPoints([]);
    } finally {
      setTried(true);
      loading.current = false;
    }
  }, [clientId, dataSource, metric, tried]);

  const format =
    metric === "retainer" ? (v) => formatCurrencyCompact(v, currency)
    : metric === "margin" ? (v) => formatPercent(v)
    : (v) => String(Math.round(v));

  return (
    <div className={className} onMouseEnter={() => void load()} onFocus={() => void load()}>
      <KpiTrendHover title={TITLES[metric]} points={points} format={format}>
        {children}
      </KpiTrendHover>
    </div>
  );
}
