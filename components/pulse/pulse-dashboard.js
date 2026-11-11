"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { PulseClientsPanel } from "@/components/pulse/pulse-clients-panel";
import { PulseDataProvider } from "@/components/pulse/pulse-data-context";
import { PulseClientRanking } from "@/components/pulse/pulse-client-ranking";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { PulsePageHeader } from "@/components/pulse/pulse-page-header";
import { PulsePeriodProvider } from "@/components/pulse/pulse-period-context";
import { PulseLatestArticlesCard } from "@/components/pulse/pulse-latest-articles-card";
import { PulseProfitabilityChart } from "@/components/pulse/pulse-profitability-chart";
import { PulseUpsellLeaderboard } from "@/components/pulse/pulse-upsell-leaderboard";
import { PulseSmartAlertsCard } from "@/components/pulse/pulse-smart-alerts-card";
import { PulseUtilTrendChart } from "@/components/pulse/pulse-util-trend-chart";
import { getPulseDemoBundle } from "@/lib/crm/pulse-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import {
  MarginBandsVisual,
  MrrBridgeVisual,
  OverheadSplitVisual,
  UtilDailyVisual,
} from "@/components/pulse/pulse-kpi-visuals";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { useReportPeriodState } from "@/lib/crm/use-report-period-state";
import { cn } from "@/lib/utils";

export function PulseDashboard() {
  const dataSource = useDataSource();
  const { selection, setSelection, primaryPeriod, queryParams } = useReportPeriodState();
  const [bundle, setBundle] = useState(/** @type {import('@/lib/crm/pulse-types').PulseBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        setBundle(getPulseDemoBundle(primaryPeriod));
        return;
      }
      const qs = databaseApiQuery(queryParams);
      const res = await fetch(`/api/pulse?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente data");
      setBundle(data);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource, primaryPeriod, queryParams]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (loading && !bundle) {
    return (
      <PulsePeriodProvider selection={selection} onSelectionChange={setSelection}>
        <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
            <div className="h-20 flex-1 animate-pulse rounded-[20px] bg-skeleton" />
            <ReportPeriodPicker selection={selection} onSelectionChange={setSelection} />
          </div>
          <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-[20px] bg-skeleton" />
            ))}
          </div>
        </div>
      </PulsePeriodProvider>
    );
  }

  if (error || !bundle) {
    return (
      <p className="rounded-xl border border-agency-bad-border bg-agency-bad-soft px-4 py-3 text-[13px] text-agency-bad">
        {error ?? "Ingen data"}
      </p>
    );
  }

  const m = bundle.agencyMetrics;
  const mrrDelta = m.retainerMRRPrev > 0 ? (m.retainerMRR - m.retainerMRRPrev) / m.retainerMRRPrev : 0;
  const utilDelta = m.utilisation - m.utilisationPrev;
  const overheadDelta = m.overheadPct - m.overheadPctPrev;
  const marginDelta = typeof m.avgMarginPrev === "number" ? m.avgMargin - m.avgMarginPrev : null;
  const overheadHours =
    m.overheadHoursMonth ??
    Math.round((m.billableHoursMonth * m.overheadPct) / Math.max(1 - m.overheadPct, 0.01));

  return (
    <PulsePeriodProvider selection={selection} onSelectionChange={setSelection} refreshing={refreshing}>
      <PulseDataProvider data={bundle}>
        <PulsePageHeader />

        <div
          className={cn(
            "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
            refreshing && "pointer-events-none opacity-70",
          )}
        >
          <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
            <PulseKpiCard
              label="Retainer MRR"
              value={
                m.upsellMrr > 0 ?
                  `${formatCurrencyCompact(m.retainerMRR)} (+${formatCurrencyCompact(m.upsellMrr)})`
                : formatCurrencyCompact(m.retainerMRR)
              }
              delta={mrrDelta}
              visual={bundle.mrrBridge ? <MrrBridgeVisual bridge={bundle.mrrBridge} /> : undefined}
              tone="brand"
            />
            <PulseKpiCard
              label="Udnyttelse"
              value={formatPercent(m.utilisation)}
              delta={utilDelta}
              deltaFormat={(v) => formatPercent(v)}
              visual={<UtilDailyVisual data={bundle.utilTrend} />}
              tone="ok"
            />
            <PulseKpiCard
              label="Overhead-tid"
              value={formatPercent(m.overheadPct)}
              delta={overheadDelta}
              deltaFormat={(v) => formatPercent(v)}
              deltaInvert
              visual={<OverheadSplitVisual billableHours={m.billableHoursMonth} overheadHours={overheadHours} />}
              tone="warn"
            />
            <PulseKpiCard
              label="Gns. margin"
              value={formatPercent(m.avgMargin)}
              delta={marginDelta}
              deltaFormat={(v) => formatPercent(v)}
              visual={<MarginBandsVisual clients={bundle.clients} />}
              tone="ok"
            />
          </section>

          <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <PulseProfitabilityChart />
            <PulseLatestArticlesCard />
          </div>

          <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2">
            <PulseClientRanking kind="healthy" />
            <PulseClientRanking kind="unhealthy" />
          </div>

          <PulseUpsellLeaderboard />

          <PulseUtilTrendChart />

          <PulseClientsPanel />

          <PulseSmartAlertsCard />
        </div>
      </PulseDataProvider>
    </PulsePeriodProvider>
  );
}
