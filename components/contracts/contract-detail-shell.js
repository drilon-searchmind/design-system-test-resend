"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  CONTRACT_DETAIL_TAB_IDS,
  ContractDetailTabbedBody,
} from "@/components/contracts/contract-detail-tabbed-body";
import { ContractDetailHeader } from "@/components/contracts/contract-detail-header";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { useDataSource } from "@/components/crm/use-data-source";
import { contractDaysUntilRenewal } from "@/lib/crm/contract-utils";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { routes } from "@/config/routes";
import {
  formatReportPeriodSubtitle,
  getCurrentReportPeriod,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import {
  CLIENTS,
  CONTRACT_REVISION_LOG,
  CONTRACTS,
  RETAINER_HISTORY,
  SMART_ALERTS,
  TASKS,
  TEAM,
} from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ contractId: string }} props
 */
export function ContractDetailShell({ contractId }) {
  const dataSource = useDataSource();
  const [period, setPeriod] = useState(() => getCurrentReportPeriod());
  const [detailTab, setDetailTab] = useState(CONTRACT_DETAIL_TAB_IDS[0]);
  const [remote, setRemote] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const handlePeriodChange = useCallback((next) => {
    setPeriod(normalizeReportPeriod(next));
  }, []);

  const loadRemote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = normalizeReportPeriod(period);
      const qs = databaseApiQuery({ year: String(p.year),
        month: String(p.month),
      });
      const res = await fetch(`/api/contracts/${encodeURIComponent(contractId)}?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kontrakt");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [contractId, period]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  const demoCtr = CONTRACTS.find((c) => c.id === contractId);
  const renewalRefDemo = lastCalendarDayIsoOfReportMonth(period.year, period.month);

  if (dataSource === "demo" && !demoCtr) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen kontrakt med id <span className="text-fg">{contractId}</span>.{" "}
          <Link href={routes.contracts} className="text-agency-brand hover:underline">
            Tilbage til Kontrakter
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "demo" && demoCtr) {
    const client = CLIENTS.find((c) => c.id === demoCtr.clientId);
    if (!client) {
      return (
        <p className="font-sans text-[13px] text-fg-muted">
          Mangler tilknyttet kunde. <Link href={routes.contracts}>Tilbage</Link>
        </p>
      );
    }

    const owner = TEAM.find((t) => t.id === demoCtr.ownerId);
    const revisions = CONTRACT_REVISION_LOG[demoCtr.id] ?? [];
    const clientTasks = TASKS.filter((t) => t.clientId === demoCtr.clientId);
    const retainerHist = RETAINER_HISTORY[demoCtr.clientId] ?? [];
    const daysUntilRenewal = contractDaysUntilRenewal(demoCtr.renewalAt, renewalRefDemo);
    const subtitle = formatReportPeriodSubtitle(period.year, period.month);

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ContractDetailHeader
          contract={{
            id: demoCtr.id,
            kind: demoCtr.kind,
            clientName: demoCtr.clientName,
            clientLogo: demoCtr.clientLogo,
            clientHue: demoCtr.clientHue,
            accountStatus: demoCtr.accountStatus,
            health: demoCtr.health,
          }}
          owner={
            owner
              ? {
                  name: owner.name,
                  role: owner.role,
                  avatar: owner.avatar,
                  hue: owner.hue,
                }
              : null
          }
          daysUntilRenewal={daysUntilRenewal}
          industry={client.industry}
          renewalReferenceIso={renewalRefDemo}
          trailing={
            <div className="flex flex-col items-end gap-1">
              <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
              <span className="hidden text-right font-sans text-[10px] text-fg-quiet sm:inline">
                Reference: {subtitle}
              </span>
            </div>
          }
        />

        <ContractDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          contract={demoCtr}
          client={client}
          renewalReferenceIso={renewalRefDemo}
          referenceChipLabel="Periodens slutdato"
          referenceChipValue={renewalRefDemo}
          retainerHistory={retainerHist}
          revisionEntries={revisions}
          tasks={clientTasks}
          alerts={SMART_ALERTS}
        />
      </div>
    );
  }

  if (dataSource === "database" && remote && typeof remote === "object" && remote.contract && remote.client) {
    /** @type {import('@/lib/crm/static-data').CONTRACTS[number]} */
    const ctr = /** @type {import('@/lib/crm/static-data').CONTRACTS[number]} */ (remote.contract);
    /** @type {import('@/lib/crm/static-data').CLIENTS[number]} */
    const client = /** @type {import('@/lib/crm/static-data').CLIENTS[number]} */ (remote.client);
    const renewalRef = String(remote.renewalReferenceIso ?? lastCalendarDayIsoOfReportMonth(period.year, period.month));
    const subtitle = formatReportPeriodSubtitle(period.year, period.month);

    /** @type {import('@/lib/crm/pulse-types').PulseTeamMember | null} */
    const owner =
      remote.owner && typeof remote.owner === "object" && "name" in remote.owner
        ? /** @type {import('@/lib/crm/pulse-types').PulseTeamMember} */ (remote.owner)
        : null;

    const daysUntilRenewal = contractDaysUntilRenewal(ctr.renewalAt, renewalRef);

    const periodLabel =
      remote.period && typeof remote.period === "object" && remote.period !== null && "label" in remote.period
        ? String(/** @type {{ label?: string }} */ (remote.period).label)
        : subtitle;

    return (
      <div
        className={cn(
          "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
          loading && "opacity-65",
        )}
      >
        {error ? (
          <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-4 py-2 font-sans text-[12px] text-agency-warn">
            {error} — viser senest indlæste data.
          </p>
        ) : null}

        <ContractDetailHeader
          contract={{
            id: ctr.id,
            kind: ctr.kind,
            clientName: ctr.clientName,
            clientLogo: ctr.clientLogo,
            clientHue: ctr.clientHue,
            accountStatus: ctr.accountStatus,
            health: ctr.health,
          }}
          owner={
            owner
              ? {
                  name: owner.name,
                  role: owner.role,
                  avatar: owner.avatar,
                  hue: owner.hue,
                }
              : null
          }
          daysUntilRenewal={daysUntilRenewal}
          industry={client.industry}
          renewalReferenceIso={renewalRef}
          trailing={
            <div className="flex flex-col items-end gap-1">
              <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
              <span className="max-w-[240px] text-right font-sans text-[10px] text-fg-quiet">
                Timer &amp; KPI for {periodLabel}
                <span className="hidden sm:inline">{` (${subtitle})`}</span>
              </span>
            </div>
          }
        />

        <ContractDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          contract={ctr}
          client={client}
          renewalReferenceIso={renewalRef}
          referenceChipLabel={typeof remote.referenceChipLabel === "string" ? remote.referenceChipLabel : undefined}
          referenceChipValue={typeof remote.referenceChipValue === "string" ? remote.referenceChipValue : undefined}
          retainerHistory={Array.isArray(remote.retainerHistory) ? remote.retainerHistory : []}
          revisionEntries={Array.isArray(remote.revisions) ? remote.revisions : []}
          tasks={Array.isArray(remote.tasks) ? remote.tasks : []}
          alerts={Array.isArray(remote.alerts) ? remote.alerts : []}
        />
      </div>
    );
  }

  if (dataSource === "database" && error && !remote?.contract) {
    return (
      <div className="space-y-4">
        <ContractDetailHeader
          contract={{
            id: contractId,
            kind: "—",
            clientName: "Kontrakt",
            clientLogo: "?",
            clientHue: 220,
            accountStatus: "paused",
            health: "ok",
          }}
          owner={null}
          daysUntilRenewal={0}
          renewalReferenceIso={lastCalendarDayIsoOfReportMonth(period.year, period.month)}
          trailing={
            <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
          }
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error}{" "}
          <Link href={routes.contracts} className="font-medium underline">
            Tilbage til Kontrakter
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "database") {
    return (
      <div className="space-y-4">
        <ContractDetailHeader
          contract={{
            id: contractId,
            kind: "—",
            clientName: "Indlæser…",
            clientLogo: "?",
            clientHue: 220,
            accountStatus: "active",
            health: "ok",
          }}
          owner={null}
          daysUntilRenewal={0}
          renewalReferenceIso={lastCalendarDayIsoOfReportMonth(period.year, period.month)}
          trailing={
            <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
          }
        />
        <div className="space-y-3">
          <div className="h-8 animate-pulse rounded-lg bg-skeleton" />
          <div className="h-24 animate-pulse rounded-2xl bg-skeleton" />
          <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
        </div>
      </div>
    );
  }

  return null;
}
