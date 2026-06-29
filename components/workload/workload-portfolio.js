"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { WorkloadDemandCard } from "@/components/workload/workload-demand-card";
import { WorkloadDeptMatrix } from "@/components/workload/workload-dept-matrix";
import { WorkloadInsightsCard } from "@/components/workload/workload-insights-card";
import { WorkloadMiniTrend } from "@/components/workload/workload-mini-trend";
import { WorkloadPageHeader } from "@/components/workload/workload-page-header";
import { WorkloadSummaryStrip } from "@/components/workload/workload-summary-strip";
import { WorkloadTeamDirectory } from "@/components/workload/workload-team-directory";
import { getWorkloadDemoBundle } from "@/lib/crm/workload-demo-bundle";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { workloadAgencyTotals } from "@/lib/crm/workload-utils";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} ReportPeriodState */

/**
 * @param {Record<string, unknown> | null} bundle
 * @returns {string | null}
 */
function mineLabelFromBundle(bundle) {
  if (!bundle || !Array.isArray(bundle.teamRows)) return null;
  const rows = /** @type {{ member?: { isMe?: boolean; name?: string } }[]} */ (bundle.teamRows);
  const me = rows.find((r) => Boolean(r.member?.isMe));
  const name = me?.member?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/**
 * @param {Record<string, unknown> | null} bundle
 */
function departmentsFromBundle(bundle) {
  if (!bundle || !Array.isArray(bundle.deptRows)) return [];
  return /** @type {{ dept: { id: string; name: string; short: string; color: string } }[]} */ (
    bundle.deptRows
  ).map((r) => ({
    id: r.dept.id,
    name: r.dept.name,
    short: r.dept.short,
    color: r.dept.color,
  }));
}

export function WorkloadPortfolio() {
  const dataSource = useDataSource();
  const [reportPeriod, setReportPeriod] = useState(
    /** @type {ReportPeriodState} */ (normalizeReportPeriod(getCurrentReportPeriod())),
  );
  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const normalizedPeriod = useMemo(
    () => normalizeReportPeriod({ year: reportPeriod.year, month: reportPeriod.month }),
    [reportPeriod.month, reportPeriod.year],
  );

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        setBundle(
          /** @type {Record<string, unknown>} */ (
            getWorkloadDemoBundle({
              year: normalizedPeriod.year,
              month: normalizedPeriod.month,
            })
          ),
        );
        hasLoadedRef.current = true;
      } else {
        const qs = new URLSearchParams({
          includeTest: "1",
          year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(`/api/workload?${qs}`, { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente workload");
        setBundle(data);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource, normalizedPeriod.month, normalizedPeriod.year]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const mineLabel = useMemo(() => mineLabelFromBundle(bundle), [bundle]);

  const totals = useMemo(() => {
    const rows =
      bundle && Array.isArray(bundle.deptRows) ?
        /** @type {ReturnType<typeof import('@/lib/crm/workload-utils').buildDeptWorkloadRows>} */ (bundle.deptRows)
      : [];
    return workloadAgencyTotals(rows);
  }, [bundle]);

  const teamMemberCount = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.teamRows)) return 0;
    return bundle.teamRows.length;
  }, [bundle]);

  const demandList = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.demandByDept)) return [];
    return /** @type {ReturnType<typeof import('@/lib/crm/workload-utils').workloadTaskDemandByDept>} */ (
      bundle.demandByDept
    );
  }, [bundle]);

  const deptRows = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.deptRows)) return [];
    return /** @type {ReturnType<typeof import('@/lib/crm/workload-utils').buildDeptWorkloadRows>} */ (bundle.deptRows);
  }, [bundle]);

  const teamRows = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.teamRows)) return [];
    return /** @type {ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>} */ (bundle.teamRows);
  }, [bundle]);

  const utilizationSeries = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.utilizationTrend)) return null;
    return /** @type {{ billable: number; overhead: number }[]} */ (bundle.utilizationTrend);
  }, [bundle]);

  const openStats = useMemo(() => {
    const raw = bundle && typeof bundle.openTaskStats === "object" && bundle.openTaskStats ? bundle.openTaskStats : {};
    const o = /** @type {Record<string, unknown>} */ (raw);
    return {
      total: typeof o.total === "number" ? o.total : 0,
      high: typeof o.high === "number" ? o.high : 0,
      overdue: typeof o.overdue === "number" ? o.overdue : 0,
    };
  }, [bundle]);

  const activeClients =
    bundle && typeof bundle.activeClientsCount === "number" && Number.isFinite(bundle.activeClientsCount) ?
      bundle.activeClientsCount
    : 0;

  const billableHoursMonth =
    bundle && typeof bundle.billableHoursMonth === "number" && Number.isFinite(bundle.billableHoursMonth) ?
      bundle.billableHoursMonth
    : 0;

  const teamWeeklyHours =
    bundle && typeof bundle.teamWeeklyHours === "number" && Number.isFinite(bundle.teamWeeklyHours) ?
      bundle.teamWeeklyHours
    : 0;

  const budgetAlertsProp = useMemo(() => {
    if (!bundle || !Object.prototype.hasOwnProperty.call(bundle, "pulseBudgetAlerts")) return undefined;
    const a = bundle.pulseBudgetAlerts;
    if (!Array.isArray(a)) return undefined;
    return /** @type {typeof import('@/lib/crm/static-data').SMART_ALERTS} */ (a);
  }, [bundle]);

  const departments = useMemo(() => departmentsFromBundle(bundle), [bundle]);

  const headerPeriodMemo = normalizedPeriod;

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <WorkloadPageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          dataSource={dataSource}
          mineLabel={null}
          loading
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton md:h-[96px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <WorkloadPageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          dataSource={dataSource}
          mineLabel={null}
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <WorkloadPageHeader
        reportPeriod={normalizedPeriod}
        onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
        dataSource={dataSource}
        mineLabel={mineLabel}
        refreshing={refreshing}
      />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <WorkloadSummaryStrip
          assigned={totals.assigned}
          tracked={totals.tracked}
          capacity={totals.capacity}
          openTasks={openStats.total}
          openHigh={openStats.high}
          openOverdue={openStats.overdue}
          activeClients={activeClients}
          billableHoursMonth={billableHoursMonth}
          teamWeeklyHours={teamWeeklyHours}
          teamMemberCount={teamMemberCount}
        />

        <p className="font-sans text-[11px] text-fg-quiet">
          Board-backlog: <span className="font-semibold text-fg">{openStats.high}</span> høj prioritet ·{" "}
          <span className={openStats.overdue > 0 ? "font-semibold text-agency-bad" : "text-fg-muted"}>
            {openStats.overdue} overskridet
          </span>{" "}
          på tværs af discipliner (ref. opgaver).
        </p>

        <WorkloadDeptMatrix rows={deptRows} />

        <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]">
            <WorkloadDemandCard demand={demandList} />
            <WorkloadMiniTrend series={utilizationSeries} />
          </div>
          <WorkloadInsightsCard
            deptRows={deptRows}
            teamRows={teamRows}
            budgetAlerts={budgetAlertsProp}
          />
        </div>

        <WorkloadTeamDirectory rows={teamRows} departments={departments} />
      </div>
    </div>
  );
}
