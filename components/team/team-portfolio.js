"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { useDataSource } from "@/components/crm/use-data-source";
import { TeamCapacityWatchCard } from "@/components/team/team-capacity-watch-card";
import { TeamDeptOverview } from "@/components/team/team-dept-overview";
import { TeamHubLinksCard } from "@/components/team/team-hub-links-card";
import { TeamPageHeader } from "@/components/team/team-page-header";
import { TeamRosterDirectory } from "@/components/team/team-roster-directory";
import { TeamSummaryStrip } from "@/components/team/team-summary-strip";
import { getTeamDemoBundle } from "@/lib/crm/team-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} Rp */

export function TeamPortfolio() {
  const dataSource = useDataSource();
  const searchParams = useSearchParams();
  const deptParam = searchParams.get("dept");

  const [reportPeriod, setReportPeriod] = useState(
    /** @type {Rp} */ (normalizeReportPeriod(getCurrentReportPeriod())),
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
            getTeamDemoBundle({
              year: normalizedPeriod.year,
              month: normalizedPeriod.month,
            })
          ),
        );
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery({ year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(`/api/team?${qs}`, { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente team-data");
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

  const headerPeriodMemo = normalizedPeriod;

  const validDept = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.departments)) return undefined;
    const ids = /** @type {{ id: string }[]} */ (bundle.departments).map((d) => d.id);
    return deptParam && ids.includes(deptParam) ? deptParam : undefined;
  }, [bundle, deptParam]);

  const mineLabelRaw = bundle?.mineLabel;
  const mineLabel =
    typeof mineLabelRaw === "string" && mineLabelRaw.trim() ? mineLabelRaw.trim() : null;

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TeamPageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          dataSource={dataSource}
          mineLabel={null}
          loading
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TeamPageHeader
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

  const kpis = bundle.kpis && typeof bundle.kpis === "object" ? /** @type {Record<string, number>} */ (bundle.kpis) : {};
  const snapshots = Array.isArray(bundle.snapshots) ? bundle.snapshots : [];
  const teamRows = Array.isArray(bundle.teamRows) ? bundle.teamRows : [];
  const departments = Array.isArray(bundle.departments) ? bundle.departments : [];

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <TeamPageHeader
        reportPeriod={normalizedPeriod}
        onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
        dataSource={dataSource}
        mineLabel={mineLabel}
        refreshing={refreshing}
      />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <TeamSummaryStrip
          headcount={typeof kpis.headcount === "number" ? kpis.headcount : 0}
          weeklyHoursSum={typeof kpis.weeklyHoursSum === "number" ? kpis.weeklyHoursSum : 0}
          disciplineCount={typeof kpis.disciplineCount === "number" ? kpis.disciplineCount : 0}
          partTimeCount={typeof kpis.partTimeCount === "number" ? kpis.partTimeCount : 0}
          highLoadCount={typeof kpis.highLoadCount === "number" ? kpis.highLoadCount : 0}
          avgWeeklyHours={typeof kpis.avgWeeklyHours === "number" ? kpis.avgWeeklyHours : 0}
          fteApprox={typeof kpis.fteApprox === "number" ? kpis.fteApprox : 0}
          openTasksTotal={typeof kpis.openTasksTotal === "number" ? kpis.openTasksTotal : 0}
        />

        <p className="font-sans text-[11px] text-fg-quiet">
          Rækker med lyse baggrunde: <span className="font-semibold text-agency-brand">dit kort</span> (fra{" "}
          <span className="">isMe</span>) ·{" "}
          <span className="font-semibold text-agency-bad">rød tone</span> ved overskredne opgaver på medarbejderen.
        </p>

        <TeamDeptOverview snapshots={snapshots} />

        <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
          <TeamHubLinksCard />
          <TeamCapacityWatchCard teamRows={teamRows} />
        </div>

        <TeamRosterDirectory
          key={validDept ?? "all"}
          teamRows={teamRows}
          departments={departments}
          initialDeptId={validDept}
        />
      </div>
    </div>
  );
}
