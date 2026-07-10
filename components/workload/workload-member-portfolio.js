"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { useDataSource } from "@/components/crm/use-data-source";
import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { LoadIndexFormulaHintContent } from "@/components/workload/load-index-formula-hint";
import { TeamMemberOpenTasksCard } from "@/components/team/team-member-open-tasks-card";
import { routes } from "@/config/routes";
import { getWorkloadMemberDemoBundle } from "@/lib/crm/workload-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatReportPeriodSubtitle, getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} ReportPeriodState */

export function WorkloadMemberPortfolio() {
  const dataSource = useDataSource();
  const params = useParams();
  const rawKey = typeof params.memberKey === "string" ? params.memberKey : "";
  const memberKey = decodeURIComponent(rawKey);

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
    if (!memberKey) return;
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        const b = getWorkloadMemberDemoBundle(memberKey, {
          year: normalizedPeriod.year,
          month: normalizedPeriod.month,
        });
        if (!b) throw new Error("Medarbejder ikke fundet");
        setBundle(/** @type {Record<string, unknown>} */ (b));
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery({
          year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(`/api/workload/${encodeURIComponent(memberKey)}?${qs}`, { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (res.status === 404 || !res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente medarbejder");
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
  }, [dataSource, memberKey, normalizedPeriod.month, normalizedPeriod.year]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource, memberKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const subtitle = formatReportPeriodSubtitle(normalizedPeriod.year, normalizedPeriod.month);

  const tasksForCard = useMemo(() => {
    if (!bundle || !Array.isArray(bundle.tasksOpen)) return [];
    return /** @type {Record<string, unknown>[]} */ (bundle.tasksOpen).map((t) => ({
      id: typeof t.key === "string" ? t.key : "",
      key: typeof t.key === "string" ? t.key : "",
      title: String(t.title ?? ""),
      hint: typeof t.hint === "string" ? t.hint : "",
      status: String(t.status ?? ""),
      priority: String(t.priority ?? ""),
      dueDate: typeof t.dueIso === "string" ? t.dueIso : "",
      clientName:
        typeof t.clientName === "string" && t.clientName ?
          t.clientName
        : typeof t.clientSlug === "string" ?
          t.clientSlug
        : "",
    }));
  }, [bundle]);

  const openStats = useMemo(() => {
    const raw =
      bundle && typeof bundle.openTaskStats === "object" && bundle.openTaskStats ? bundle.openTaskStats : {};
    const o = /** @type {Record<string, unknown>} */ (raw);
    return {
      total: typeof o.total === "number" ? o.total : 0,
      high: typeof o.high === "number" ? o.high : 0,
      overdue: typeof o.overdue === "number" ? o.overdue : 0,
    };
  }, [bundle]);

  const showSkeleton = loading && !bundle;

  const member =
    bundle && typeof bundle.member === "object" && bundle.member ?
      /** @type {{ id?: string; name?: string; role?: string; avatar?: string; image?: string; hue?: number; weeklyHours?: number; isMe?: boolean }} */ (
        bundle.member
      )
    : null;

  const department =
    bundle && typeof bundle.department === "object" && bundle.department ?
      /** @type {{ id?: string; name?: string; short?: string }} */ (bundle.department)
    : null;

  const loadIndex =
    bundle && typeof bundle.loadIndex === "number" && Number.isFinite(bundle.loadIndex) ? bundle.loadIndex : 0;

  const hoursMonth =
    bundle && typeof bundle.hoursMonth === "number" && Number.isFinite(bundle.hoursMonth) ? bundle.hoursMonth : 0;
  const billableHoursMonth =
    bundle &&
    typeof bundle.billableHoursMonth === "number" &&
    Number.isFinite(bundle.billableHoursMonth) ?
      bundle.billableHoursMonth
    : 0;

  const calendarTodayIso =
    bundle && typeof bundle.calendarTodayIso === "string" ? bundle.calendarTodayIso : undefined;

  const loadTone = loadIndex >= 82 ? "bad" : loadIndex >= 65 ? "warn" : "ok";
  const backlogTone = openStats.overdue > 0 ? "bad" : openStats.high > 2 ? "warn" : "ok";

  if (!memberKey) {
    return (
      <div className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        Mangler medarbejder-nøgle i URL&apos;en.
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="h-10 animate-pulse rounded-lg bg-skeleton" />
        <div className="h-28 animate-pulse rounded-2xl bg-skeleton" />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (!loading && (error || !bundle || !member)) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
          <Link href={routes.workload} className="text-fg-muted transition-colors hover:text-agency-brand hover:underline">
            Belægning
          </Link>
        </nav>
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Medarbejder ikke fundet"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link href={routes.workload} className="text-fg-muted transition-colors hover:text-agency-brand hover:underline">
          Belægning
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="truncate text-fg">{member.name}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <CrmAvatar
              label={typeof member.avatar === "string" ? member.avatar : "?"}
              src={typeof member.image === "string" ? member.image : undefined}
              hue={typeof member.hue === "number" ? member.hue : 220}
              className="size-12 text-[13px]"
            />
            <div className="min-w-0">
              <h1 className="font-sans text-[21px] font-semibold tracking-tight text-fg">{member.name}</h1>
              <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
                {member.role}
                {department?.name ? ` · ${department.name}` : null}
                {typeof member.weeklyHours === "number" ? ` · ${member.weeklyHours} t/uge` : null}
              </p>
              <p className="mt-1 font-sans text-[12px] text-fg-muted">
                <span className="capitalize">{subtitle}</span>
                {member.isMe ?
                  <>
                    {" · "}
                    <span className="font-semibold text-fg">Din profil</span>
                  </>
                : null}
                {refreshing ?
                  <span className="text-fg-quiet"> · Opdaterer…</span>
                : null}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportPeriodPicker
            year={reportPeriod.year}
            month={reportPeriod.month}
            onChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          />
        </div>
      </header>

      <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
        <PulseKpiCard label="Åbne opgaver" value={String(openStats.total)} tone={backlogTone} />
        <div className="tally-panel p-4 md:p-5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-soft">
            <CrmHoverPopover
              title="Index — belastning"
              content={<LoadIndexFormulaHintContent includeBarNote />}
              triggerClassName="underline decoration-dotted decoration-border/80 underline-offset-2"
            >
              Belægningsindex
            </CrmHoverPopover>
          </p>
          <p className={cn("mt-2 font-sans text-[26px] font-semibold tabular-nums tracking-tight", loadTone === "bad" ? "text-agency-bad" : loadTone === "warn" ? "text-agency-warn" : "text-agency-ok")}>
            {loadIndex}%
          </p>
          <PulseUtilBar hours={loadIndex} budget={100} className="mt-3 max-w-full" />
        </div>
        <PulseKpiCard label="Timer (periode)" value={`${hoursMonth} t`} tone="brand" />
        <PulseKpiCard label="Fakturerbare timer" value={`${billableHoursMonth} t`} tone="ok" />
      </section>

      <p className="font-sans text-[11px] text-fg-quiet">
        {openStats.high} høj prioritet ·{" "}
        <span className={openStats.overdue > 0 ? "font-semibold text-agency-bad" : "text-fg-muted"}>
          {openStats.overdue} overskredet
        </span>
      </p>

      <TeamMemberOpenTasksCard tasks={tasksForCard} dueRefIso={calendarTodayIso} />
    </div>
  );
}
