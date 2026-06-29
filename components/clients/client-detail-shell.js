"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  CLIENT_DETAIL_TAB_DEFS,
  ClientDetailTabbedBody,
} from "@/components/clients/client-detail-tabbed-body";
import { ClientDetailHeader } from "@/components/clients/client-detail-header";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { useDataSource } from "@/components/crm/use-data-source";
import { routes } from "@/config/routes";
import {
  CLIENTS,
  CONTRACTS,
  NOTES_BY_CLIENT,
  RETAINER_HISTORY,
  SMART_ALERTS,
  TASKS,
  TEAM,
} from "@/lib/crm/static-data";
import {
  formatReportPeriodSubtitle,
  getCurrentReportPeriod,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/**
 * @param {{ clientSlug: string }} props
 */
export function ClientDetailShell({ clientSlug }) {
  const dataSource = useDataSource();
  const [period, setPeriod] = useState(() => getCurrentReportPeriod());
  const [detailTab, setDetailTab] = useState(CLIENT_DETAIL_TAB_DEFS[0].id);

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
      const qs = new URLSearchParams({
        includeTest: "1",
        year: String(p.year),
        month: String(p.month),
      });
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kunde");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [clientSlug, period]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  const demoClient = CLIENTS.find((c) => c.id === clientSlug);

  if (dataSource === "demo" && !demoClient) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen kunde med id <span className="text-fg">{clientSlug}</span>.{" "}
          <Link href={routes.clients} className="text-agency-brand hover:underline">
            Tilbage til Kunder
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "demo" && demoClient) {
    const owner = TEAM.find((t) => t.id === demoClient.owner);
    const notes = NOTES_BY_CLIENT[clientSlug] ?? [];
    const contract = CONTRACTS.find((row) => row.clientId === clientSlug) ?? null;
    const retainerHistory = RETAINER_HISTORY[clientSlug] ?? [];
    const clientTasks = TASKS.filter((t) => t.clientId === clientSlug);
    const subtitle = formatReportPeriodSubtitle(period.year, period.month);

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ClientDetailHeader
          client={demoClient}
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
          trailing={
            <div className="flex flex-col items-end gap-1">
              <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
              <span className="hidden text-right font-sans text-[10px] text-fg-quiet sm:inline">
                Reference: {subtitle}
              </span>
            </div>
          }
        />

        <ClientDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          client={demoClient}
          contract={contract}
          retainerHistory={retainerHistory}
          alerts={SMART_ALERTS}
          notes={notes}
          tasks={clientTasks}
          kpiTimerLabel="Timer denne md"
        />
      </div>
    );
  }

  if (dataSource === "database" && remote && typeof remote === "object" && remote.client) {
    /** @type {import('@/lib/crm/static-data').CLIENTS[number]} */
    const c = /** @type {import('@/lib/crm/static-data').CLIENTS[number]} */ (remote.client);
    const subtitle = formatReportPeriodSubtitle(period.year, period.month);

    /** @type {import('@/lib/crm/pulse-types').PulseTeamMember | null} */
    const owner =
      remote.owner && typeof remote.owner === "object" && "name" in remote.owner
        ? /** @type {import('@/lib/crm/pulse-types').PulseTeamMember} */ (remote.owner)
        : null;

    const periodLabel =
      remote.period &&
      typeof remote.period === "object" &&
      remote.period !== null &&
      "label" in remote.period
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

        <ClientDetailHeader
          client={c}
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

        <ClientDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          client={c}
          contract={remote.contract ?? null}
          contractDetailHref={remote.contract ? null : undefined}
          retainerHistory={Array.isArray(remote.retainerHistory) ? remote.retainerHistory : []}
          alerts={Array.isArray(remote.alerts) ? remote.alerts : []}
          notes={Array.isArray(remote.notes) ? remote.notes : []}
          notesTeamMembers={Array.isArray(remote.team) ? remote.team : undefined}
          tasks={Array.isArray(remote.tasks) ? remote.tasks : []}
          kpiTimerLabel={
            typeof remote.kpiTimerLabel === "string" ? remote.kpiTimerLabel : "Timer i perioden"
          }
        />
      </div>
    );
  }

  if (dataSource === "database" && error && !remote?.client) {
    return (
      <div className="space-y-4">
        <ClientDetailHeader
          client={{
            id: clientSlug,
            name: "Kunde",
            industry: "",
            logo: "?",
            hue: 220,
            status: "active",
            health: "ok",
            lastActivity: "—",
          }}
          owner={null}
          trailing={
            <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
          }
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error}{" "}
          <Link href={routes.clients} className="font-medium underline">
            Tilbage til Kunder
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "database") {
    return (
      <div className="space-y-4">
        <ClientDetailHeader
          client={{
            id: clientSlug,
            name: "Indlæser…",
            industry: "",
            logo: "?",
            hue: 220,
            status: "active",
            health: "ok",
            lastActivity: "—",
          }}
          owner={null}
          trailing={
            <ReportPeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
          }
        />
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-skeleton" />
          <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
        </div>
      </div>
    );
  }

  return null;
}
