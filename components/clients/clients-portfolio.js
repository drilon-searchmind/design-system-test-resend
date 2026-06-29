"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ClientsDirectory } from "@/components/clients/clients-directory";
import { ClientsPageHeader } from "@/components/clients/clients-page-header";
import { ClientsSummaryStrip } from "@/components/clients/clients-summary-strip";
import { useDataSource } from "@/components/crm/use-data-source";
import { getPulseDemoBundle } from "@/lib/crm/pulse-demo-bundle";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

export function ClientsPortfolio() {
  const dataSource = useDataSource();
  const [period, setPeriod] = useState(() => getCurrentReportPeriod());
  const [bundle, setBundle] = useState(/** @type {import('@/lib/crm/pulse-types').PulseBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const handlePeriodChange = useCallback((next) => {
    setPeriod(normalizeReportPeriod(next));
  }, []);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const p = normalizeReportPeriod(period);
      if (dataSource === "demo") {
        setBundle(getPulseDemoBundle(p));
        hasLoadedRef.current = true;
      } else {
        const qs = new URLSearchParams({
          includeTest: "1",
          year: String(p.year),
          month: String(p.month),
        });
        const res = await fetch(`/api/pulse?${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente data");
        setBundle(data);
        hasLoadedRef.current = true;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource, period]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ClientsPageHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          loading
          clients={null}
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton md:h-[100px]" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ClientsPageHeader period={period} onPeriodChange={handlePeriodChange} clients={null} />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <ClientsPageHeader
        period={period}
        onPeriodChange={handlePeriodChange}
        refreshing={refreshing}
        clients={bundle.clients}
      />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <ClientsSummaryStrip clients={bundle.clients} />

        <ClientsDirectory
          variant="full"
          clients={bundle.clients}
          team={bundle.team}
          hoursColumnLabel="Timer i perioden"
        />

      </div>
    </div>
  );
}
