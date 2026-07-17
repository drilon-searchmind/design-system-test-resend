"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ContractsDirectory } from "@/components/contracts/contracts-directory";
import { ContractsPageHeader } from "@/components/contracts/contracts-page-header";
import { ContractsSummaryStrip } from "@/components/contracts/contracts-summary-strip";
import { useDataSource } from "@/components/crm/use-data-source";
import { getContractsDemoBundle } from "@/lib/crm/contracts-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { useReportPeriodState } from "@/lib/crm/use-report-period-state";
import { cn } from "@/lib/utils";

/** @typedef {ReturnType<typeof getContractsDemoBundle>} ContractsPortfolioBundle */

export function ContractsPortfolio() {
  const dataSource = useDataSource();
  const { selection, setSelection, primaryPeriod, queryParams, subtitle } = useReportPeriodState();
  const [bundle, setBundle] = useState(/** @type {ContractsPortfolioBundle | null} */ (null));
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
        setBundle(getContractsDemoBundle(primaryPeriod));
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery(queryParams);
        const res = await fetch(`/api/contracts?${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kontrakter");
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
  }, [dataSource, primaryPeriod, queryParams]);

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
        <ContractsPageHeader
          selection={selection}
          onSelectionChange={setSelection}
          subtitle={subtitle}
          loading
          summary={null}
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
        <ContractsPageHeader selection={selection} onSelectionChange={setSelection} subtitle={subtitle} summary={null} />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <ContractsPageHeader
        selection={selection}
        onSelectionChange={setSelection}
        subtitle={subtitle}
        refreshing={refreshing}
        summary={bundle.summary}
      />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <ContractsSummaryStrip
          contracts={bundle.contracts}
          summary={bundle.summary}
          renewalReferenceIso={bundle.renewalReferenceIso}
        />

        <ContractsDirectory
          contracts={bundle.contracts}
          team={bundle.team}
          renewalReferenceIso={bundle.renewalReferenceIso}
        />
      </div>
    </div>
  );
}
