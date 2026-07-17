"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { useDataSource } from "@/components/crm/use-data-source";
import { TeamMemberHeader } from "@/components/team/team-member-header";
import { TeamMemberKpiStrip } from "@/components/team/team-member-kpi-strip";
import { TeamMemberOpenTasksCard } from "@/components/team/team-member-open-tasks-card";
import { TeamMemberQuickLinksCard } from "@/components/team/team-member-quick-links-card";
import { getWorkloadMemberDemoBundle } from "@/lib/crm/workload-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { useReportPeriodState } from "@/lib/crm/use-report-period-state";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

export function TeamMemberPortfolio() {
  const dataSource = useDataSource();
  const params = useParams();
  const rawId = typeof params.memberId === "string" ? params.memberId : "";
  const memberKey = decodeURIComponent(rawId);

  const { selection, setSelection, primaryPeriod, queryParams, subtitle } = useReportPeriodState();
  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!memberKey) return;
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        const b = getWorkloadMemberDemoBundle(memberKey, primaryPeriod);
        if (!b) throw new Error("Medarbejder ikke fundet");
        setBundle(/** @type {Record<string, unknown>} */ (b));
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery(queryParams);
        const res = await fetch(`/api/workload/${encodeURIComponent(memberKey)}?${qs}`, { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (res.status === 404 || !res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente profil");
        }
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
  }, [dataSource, memberKey, primaryPeriod, queryParams]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource, memberKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!bundle || typeof bundle.member !== "object" || !bundle.member) return;
    const m = /** @type {{ name?: string }} */ (bundle.member);
    if (typeof m.name === "string" && m.name.trim()) {
      document.title = `${m.name} · Team · 1337-crm`;
    }
  }, [bundle]);

  const member =
    bundle && typeof bundle.member === "object" && bundle.member ?
      /** @type {{ id?: string; name?: string; role?: string; dept?: string; avatar?: string; hue?: number; weeklyHours?: number; isMe?: boolean }} */ (
        bundle.member
      )
    : null;

  const department =
    bundle && typeof bundle.department === "object" && bundle.department ?
      /** @type {{ id: string; name: string; short: string }} */ (bundle.department)
    : null;

  const calendarTodayIso =
    bundle && typeof bundle.calendarTodayIso === "string" ? bundle.calendarTodayIso : "2026-05-08";

  const tasksForCard = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.tasksOpen)) return [];
    return /** @type {Record<string, unknown>[]} */ (bundle.tasksOpen).map((row) => {
      const t = /** @type {Record<string, unknown>} */ (row);
      const key = typeof t.key === "string" ? t.key : "";
      const dueIso = typeof t.dueIso === "string" ? t.dueIso : "";
      const due = dueIso ? dueIso.slice(0, 10) : "";
      return {
        id: key || String(t.title ?? "task"),
        key,
        title: String(t.title ?? ""),
        hint: typeof t.hint === "string" ? t.hint : "",
        status: String(t.status ?? "todo"),
        priority: String(t.priority ?? "medium"),
        dueDate: due,
        clientName: typeof t.clientSlug === "string" ? t.clientSlug : "",
      };
    });
  }, [bundle]);

  const loadIndex =
    bundle && typeof bundle.loadIndex === "number" && Number.isFinite(bundle.loadIndex) ? bundle.loadIndex : 0;
  const openCount =
    bundle && typeof bundle.openCount === "number" && Number.isFinite(bundle.openCount) ?
      bundle.openCount
    : 0;
  const highCount =
    bundle && typeof bundle.highCount === "number" && Number.isFinite(bundle.highCount) ?
      bundle.highCount
    : 0;
  const overdueCount =
    bundle && typeof bundle.overdueCount === "number" && Number.isFinite(bundle.overdueCount) ?
      bundle.overdueCount
    : 0;

  if (!memberKey) {
    return (
      <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        Mangler medarbejder-id i URL.
      </p>
    );
  }

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="h-40 animate-pulse rounded-xl bg-skeleton" />
        <div className="h-32 animate-pulse rounded-xl bg-skeleton" />
      </div>
    );
  }

  if (!loading && (error || !member)) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <Link href={routes.team} className="font-sans text-[13px] font-medium text-agency-brand hover:underline">
          ← Team
        </Link>
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Profil ikke fundet"}
        </p>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={routes.team} className="font-sans text-[13px] font-medium text-agency-brand hover:underline">
          ← Team
        </Link>
        <ReportPeriodPicker selection={selection} onSelectionChange={setSelection} />
      </div>

      <TeamMemberHeader member={member} department={department} />

      <p className="font-sans text-[11px] text-fg-muted">
        <span className="capitalize">{subtitle}</span>
        {" · "}
        Rapporteret belægning og opgaver følger samme periode som Belægning.
      </p>

      <TeamMemberKpiStrip
        loadIndex={loadIndex}
        openCount={openCount}
        highCount={highCount}
        overdueCount={overdueCount}
      />

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)] lg:items-start">
        <TeamMemberOpenTasksCard tasks={tasksForCard} dueRefIso={calendarTodayIso.slice(0, 10)} />
        <div className="flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]">
          {department ?
            <TeamMemberQuickLinksCard deptId={department.id} deptName={department.name} />
          : null}
        </div>
      </div>
    </div>
  );
}
