"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContractsDirectory } from "@/components/contracts/contracts-directory";
import { ContractsPageHeader } from "@/components/contracts/contracts-page-header";
import { ContractsSendModal } from "@/components/contracts/contracts-send-modal";
import { ContractsServicesPanel } from "@/components/contracts/contracts-services-panel";
import { ContractsSummaryStrip } from "@/components/contracts/contracts-summary-strip";
import { ContractsTemplatesPanel } from "@/components/contracts/contracts-templates-panel";
import { useDataSource } from "@/components/crm/use-data-source";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { buildFallbackContractServices } from "@/lib/contracts/contract-services";
import { getContractsDemoBundle } from "@/lib/crm/contracts-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @typedef {ReturnType<typeof getContractsDemoBundle> & {
 *   clients?: Array<{ id: string; mongoId: string; name: string; status: string }>;
 *   departments?: Array<{ key: string; name: string }>;
 *   services?: import('@/lib/contracts/contract-services').ContractServiceOption[];
 * }} ContractsPortfolioBundle
 */

export function ContractsPortfolio() {
  const dataSource = useDataSource();
  const [bundle, setBundle] = useState(/** @type {ContractsPortfolioBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [sendOpen, setSendOpen] = useState(false);
  const [setupTab, setSetupTab] = useState(/** @type {"templates" | "services"} */ ("templates"));
  const hasLoadedRef = useRef(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const closeSend = useCallback(() => setSendOpen(false), []);

  const departments = useMemo(
    () => (bundle && "departments" in bundle && Array.isArray(bundle.departments) ? bundle.departments : []),
    [bundle],
  );
  /** Servicekatalog til send-dialogen — demo bruger standardlisten ud fra de statiske afdelinger. */
  const services = useMemo(() => {
    if (dataSource === "demo") {
      return buildFallbackContractServices(DEPARTMENTS.map((d) => ({ key: d.id, name: d.name })));
    }
    if (bundle && "services" in bundle && Array.isArray(bundle.services)) return bundle.services;
    return buildFallbackContractServices(departments);
  }, [bundle, dataSource, departments]);

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

        <ContractsDirectory
          contracts={bundle.contracts}
          team={bundle.team}
          renewalReferenceIso={bundle.renewalReferenceIso}
        />

        <section className="flex flex-col gap-3" aria-label="Opsætning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Opsætning
            </h2>
            {isAdmin ? (
              <PulseSegmentedControl
                size="sm"
                active={setupTab}
                onChange={(id) => setSetupTab(/** @type {"templates" | "services"} */ (id))}
                tabs={[
                  { id: "templates", label: "Skabeloner" },
                  { id: "services", label: "Services", count: services.length },
                ]}
              />
            ) : null}
          </div>
          {isAdmin && setupTab === "services" ? (
            <ContractsServicesPanel departments={departments} onMutate={() => void load()} />
          ) : (
            <ContractsTemplatesPanel />
          )}
        </section>
      </div>

      <ContractsSendModal
        open={sendOpen}
        onClose={closeSend}
        onSent={() => {
          void load();
        }}
        clients={Array.isArray(bundle.clients) ? bundle.clients : []}
        services={services}
        team={Array.isArray(bundle.team) ? bundle.team : []}
      />
    </div>
  );
}
