"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ContractsDirectory } from "@/components/contracts/contracts-directory";
import { ContractsPageHeader } from "@/components/contracts/contracts-page-header";
import { ContractsSendModal } from "@/components/contracts/contracts-send-modal";
import { ContractsSummaryStrip } from "@/components/contracts/contracts-summary-strip";
import { ContractsTemplatesPanel } from "@/components/contracts/contracts-templates-panel";
import { useDataSource } from "@/components/crm/use-data-source";
import { getContractsDemoBundle } from "@/lib/crm/contracts-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/** @typedef {ReturnType<typeof getContractsDemoBundle> & { clients?: Array<{ id: string; mongoId: string; name: string; status: string }> }} ContractsPortfolioBundle */

export function ContractsPortfolio() {
  const dataSource = useDataSource();
  const [bundle, setBundle] = useState(/** @type {ContractsPortfolioBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [sendOpen, setSendOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        const demo = getContractsDemoBundle();
        setBundle({ ...demo, clients: [] });
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery();
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
  }, [dataSource]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const headerActions = (
    <button
      type="button"
      onClick={() => setSendOpen(true)}
      className="inline-flex items-center justify-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2 font-sans text-[12px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80"
    >
      Ny kontrakt / send
    </button>
  );

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ContractsPageHeader loading summary={null} actions={headerActions} />
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
        <ContractsPageHeader summary={null} actions={headerActions} />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <ContractsPageHeader
        refreshing={refreshing}
        summary={bundle.summary}
        actions={headerActions}
      />

      <div
        className={cn(
          "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
          refreshing && "opacity-65",
        )}
      >
        <ContractsSummaryStrip
          contracts={bundle.contracts}
          summary={bundle.summary}
          renewalReferenceIso={bundle.renewalReferenceIso}
        />

        <div className="grid gap-[length:var(--ds-studio-stack)] xl:grid-cols-[minmax(0,1fr)_320px]">
          <ContractsDirectory
            contracts={bundle.contracts}
            team={bundle.team}
            renewalReferenceIso={bundle.renewalReferenceIso}
          />
          <ContractsTemplatesPanel />
        </div>
      </div>

      <ContractsSendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          void load();
        }}
        clients={Array.isArray(bundle.clients) ? bundle.clients : []}
      />
    </div>
  );
}
