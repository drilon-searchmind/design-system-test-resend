"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrmDialog } from "@/components/crm/crm-dialog";
import { TimeEntriesDirectory } from "@/components/time/time-entries-directory";
import { TimeEntryCreateForm } from "@/components/time/time-entry-create-form";
import { TimePageHeader } from "@/components/time/time-page-header";
import { TimeQuickLogPanel } from "@/components/time/time-quick-log-panel";
import { TimeSummaryStrip } from "@/components/time/time-summary-strip";
import { TimeMonthCalendar } from "@/components/time/time-month-calendar";
import { useDataSource } from "@/components/crm/use-data-source";
import { routes } from "@/config/routes";
import { getTimeEntriesDemoBundle } from "@/lib/crm/time-entries-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatIsoWeekdayLongDa } from "@/lib/crm/format-da";
import { formatReportPeriodSubtitle, getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { buildReportMonthCalendarCells, minutesPerUtcIsoDayFromWireEntries } from "@/lib/crm/time-utils";
import { cn } from "@/lib/utils";

/**
 * Kalenderfelter ud fra bunlde — API/demo sender `calendarCells`; ellers falder vi tilbage.
 * @param {Record<string, unknown> | null} bundle
 */
function calendarCellsForBundle(bundle) {
  const raw = bundle && Array.isArray(bundle.calendarCells) ? bundle.calendarCells : null;
  if (raw && raw.length > 0) return raw;

  const rpUnknown = bundle?.reportPeriod;
  const yr =
    rpUnknown &&
    typeof rpUnknown === "object" &&
    rpUnknown !== null &&
    "year" in rpUnknown ?
      Number(rpUnknown.year)
    : NaN;
  const mo =
    rpUnknown && typeof rpUnknown === "object" && rpUnknown !== null && "month" in rpUnknown ?
      Number(rpUnknown.month)
    : NaN;

  /** @type {{ year: number; month: number }} */
  const reportPeriod = Number.isFinite(yr) && Number.isFinite(mo) ?
    normalizeReportPeriod({ year: yr, month: mo })
  : normalizeReportPeriod(getCurrentReportPeriod());

  const tk =
    typeof bundle?.todayKey === "string" ?
      bundle.todayKey.trim().slice(0, 10)
    : "";

  const entries =
    bundle && Array.isArray(bundle.entries) ?
      /** @type {{ durationMinutes?: number; workedAtIso?: string | null }[]} */ (bundle.entries)
    : [];

  const totalsIso = minutesPerUtcIsoDayFromWireEntries(entries);
  return buildReportMonthCalendarCells(reportPeriod.year, reportPeriod.month, totalsIso, tk);
}

/** @param {Record<string, unknown>} e */
function rowBillableForKpi(e) {
  const bill = e.billable !== false;
  const slug = typeof e.clientSlug === "string" ? e.clientSlug.trim() : "";
  return bill && slug.length > 0;
}

/** @param {Record<string, unknown>} e */
function durationRounded(e) {
  const v = typeof e.durationMinutes === "number" ? e.durationMinutes : Number(e.durationMinutes);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

/** Arb.d.: sum af min på celler hvor weekend === false og iso er gyldig. */
function weekdayWorkedMinutesSum(cells) {
  /** @typedef {{ iso?: string; minutes?: unknown; kind?: string; weekend?: boolean }} C */
  return (cells ?? []).reduce((/** @type {number} */ s, /** @type {C} */ c) => {
    if (c.kind === "blank") return s;
    if (typeof c.iso !== "string" || c.iso.length < 10) return s;
    if (c.weekend) return s;
    const n =
      typeof c.minutes === "number" ? c.minutes : c.minutes == null ?
        0
      : Number(c.minutes);
    return Number.isFinite(n) ? s + Number(n) : s;
  }, 0);
}

export function TimePortfolio() {
  const dataSource = useDataSource();
  const router = useRouter();
  /** @typedef {{ year: number; month: number }} RP */
  const [reportPeriod, setReportPeriod] = useState(
    /** @type {RP} */ (normalizeReportPeriod(getCurrentReportPeriod())),
  );

  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [showCreate, setShowCreate] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);
  /** Manuel valg i månedskalenderen (`null` = brug autoprioritet ud fra måned/`todayKey`). */
  const [pickedDayIso, setPickedDayIso] = useState(/** @type {string | null} */ (null));

  const openCreate = useCallback(() => {
    setCreateFormKey((n) => n + 1);
    setShowCreate(true);
    setCreateError(null);
  }, []);

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setCreateError(null);
  }, []);

  const normalizedPeriod = useMemo(
    () => normalizeReportPeriod({ year: reportPeriod.year, month: reportPeriod.month }),
    [reportPeriod.year, reportPeriod.month],
  );

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        /** @type {Record<string, unknown>} */
        const b = getTimeEntriesDemoBundle({
          year: normalizedPeriod.year,
          month: normalizedPeriod.month,
        });
        setBundle(b);
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery({ year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(`/api/time-entries?${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente tidsdata");
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
    setPickedDayIso(null);
  }, [normalizedPeriod.year, normalizedPeriod.month, dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const calendarCells = useMemo(() => calendarCellsForBundle(bundle ?? null), [bundle]);

  const entriesAll = useMemo(
    () =>
      bundle && Array.isArray(bundle.entries) ?
        /** @type {Record<string, unknown>[]} */ (bundle.entries)
      : [],
    [bundle],
  );

  const todayKey =
    bundle && typeof bundle.todayKey === "string" ? bundle.todayKey.trim().slice(0, 10) : "";

  const rangeFromIso =
    bundle && typeof bundle.fromIso === "string" ? bundle.fromIso.trim().slice(0, 10) : "";
  const rangeToIso =
    bundle && typeof bundle.toIso === "string" ? bundle.toIso.trim().slice(0, 10) : "";

  const stampListDayIso = useMemo(() => {
    const pickRaw = pickedDayIso?.trim().slice(0, 10) ?? "";
    if (
      pickRaw.length >= 10 &&
      rangeFromIso &&
      rangeToIso &&
      pickRaw >= rangeFromIso &&
      pickRaw <= rangeToIso
    )
      return pickRaw;

    if (
      typeof todayKey === "string" &&
      todayKey.length >= 10 &&
      rangeFromIso &&
      rangeToIso &&
      todayKey >= rangeFromIso &&
      todayKey <= rangeToIso
    )
      return todayKey;

    if (typeof rangeFromIso === "string" && rangeFromIso.length >= 10) return rangeFromIso;

    return todayKey.slice(0, 10);
  }, [pickedDayIso, todayKey, rangeFromIso, rangeToIso]);

  /** Poster for valgt kalenderdag (liste under månedskalenderen). */
  const stampListEntries = useMemo(
    () =>
      stampListDayIso.length >= 10 ?
        entriesAll.filter((e) =>
          typeof e.workedAtIso === "string" ? e.workedAtIso.slice(0, 10) === stampListDayIso : false,
        )
      : [],

    [entriesAll, stampListDayIso],
  );

  const stampsHeading = useMemo(() => {
    if (!(typeof stampListDayIso === "string") || stampListDayIso.length < 10) return "Stempler i dag";
    if (todayKey.length >= 10 && stampListDayIso === todayKey) return "Stempler i dag";
    return `Stempler (${formatIsoWeekdayLongDa(stampListDayIso)})`;
  }, [stampListDayIso, todayKey]);

  const todayEntries = useMemo(
    () =>
      entriesAll.filter((e) =>
        typeof e.workedAtIso === "string" ? e.workedAtIso.slice(0, 10) === todayKey : false,
      ),
    [entriesAll, todayKey],
  );

  const summary = useMemo(() => {
    let todayTotalMin = 0;
    let billableMin = 0;
    for (const e of todayEntries) {
      const m = durationRounded(e);
      todayTotalMin += m;
      if (rowBillableForKpi(e)) billableMin += m;
    }
    const internalMin = Math.max(0, todayTotalMin - billableMin);

    const periodGoalMin =
      bundle && typeof bundle.weekGoalMinutes === "number" && Number.isFinite(bundle.weekGoalMinutes) ?
        bundle.weekGoalMinutes
      : 0;

    return {
      todayTotalMin,
      billableMin,
      internalMin,
      entryCount: todayEntries.length,
      /** matcher målmålinger (kun man–fre) */
      periodWeekdayLoggedMin: weekdayWorkedMinutesSum(calendarCells),
      periodGoalMin,
    };
  }, [todayEntries, bundle, calendarCells]);

  const calendarCaption =
    bundle && typeof bundle.calendarCaption === "string" ?
      bundle.calendarCaption
    : bundle && typeof bundle.weekCaption === "string" ?
      bundle.weekCaption
    : "";

  const subtitleForUi =
    (bundle && typeof bundle.periodSubtitle === "string" ?
      bundle.periodSubtitle.trim().slice(0, 1).toUpperCase() + bundle.periodSubtitle.trim().slice(1)
    : formatReportPeriodSubtitle(normalizedPeriod.year, normalizedPeriod.month).replace(/^./, (ch) =>
        ch.toUpperCase(),
      )) || "";

  const compareLabelDa = `${subtitleForUi} vs. mål (arb.d.)`;

  const dailyTarget =
    bundle && typeof bundle.dailyTargetMinutes === "number" ? bundle.dailyTargetMinutes : 450;

  const mineLabel =
    bundle && typeof bundle.mineLabel === "string" && bundle.mineLabel.trim() ? bundle.mineLabel.trim() : null;

  const handleCreate = useCallback(
    async (body) => {
      if (dataSource !== "database") return;
      setCreateSubmitting(true);
      setCreateError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/time-entries?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette");
        closeCreate();
        await load();
        const wire = data?.wire && typeof data.wire === "object" ? data.wire : {};
        const mongoId =
          typeof wire.mongoId === "string" && wire.mongoId.trim() ? String(wire.mongoId).trim() : "";
        const nextId =
          mongoId ||
          (typeof wire.id === "string" ? String(wire.id).trim() : "");
        if (nextId) router.push(`${routes.time}/${encodeURIComponent(nextId)}`);
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Fejl");
      } finally {
        setCreateSubmitting(false);
      }
    },
    [closeCreate, dataSource, load, router],
  );

  const headerPeriodMemo = normalizedPeriod;

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TimePageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          mineLabel={null}
          dataSource={dataSource}
          loading
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton md:h-[100px]" />
          ))}
        </div>
        <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.42fr)_minmax(280px,1fr)] lg:items-start">
          <div className="h-[340px] animate-pulse rounded-2xl bg-skeleton" />
          <div className="h-[200px] animate-pulse rounded-2xl bg-skeleton" />
        </div>
        <div className="h-[420px] animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TimePageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          mineLabel={null}
          dataSource={dataSource}
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  /** @typedef {{ id?: string } & Record<string, unknown>} DeptRowLocal */
  const deptArr = Array.isArray(bundle.departments) ? /** @type {DeptRowLocal[]} */ (bundle.departments) : [];
  const clientsPick =
    bundle && Array.isArray(bundle.clientsPicklist) ?
      /** @type {{ value: string; label: string }[]} */ (
        bundle.clientsPicklist
      )
    : [];
  const tasksPick =
    bundle && Array.isArray(bundle.tasksPicklist) ?
      /** @type {{ value: string; label: string; clientSlug?: string; departmentKey?: string }[]} */ (
        bundle.tasksPicklist
      )
    : [];
  const defaultDepartmentKey =
    bundle && typeof bundle.defaultDepartmentKey === "string" ? bundle.defaultDepartmentKey : "";

  const openHeaderCreate = dataSource === "database" ? openCreate : undefined;

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <TimePageHeader
        reportPeriod={normalizedPeriod}
        onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
        mineLabel={mineLabel}
        dataSource={dataSource}
        refreshing={refreshing}
        onOpenCreate={openHeaderCreate}
        createModalOpen={showCreate}
      />

      <CrmDialog
        open={showCreate && dataSource === "database"}
        onClose={closeCreate}
        ariaLabel="Ny registrering"
        maxWidthClass="w-[min(100vw-1.5rem,520px)]"
      >
        <div className="flex max-h-[min(92vh,840px)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                Ny registrering
              </p>
              <h2 className="font-sans text-[17px] font-semibold leading-snug text-fg md:text-[18px]">Manuel tid</h2>
            </div>
            <button
              type="button"
              onClick={closeCreate}
              disabled={createSubmitting}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-lg leading-none text-fg-muted hover:border-agency-brand-border hover:text-fg disabled:opacity-40"
              aria-label="Luk"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4 md:px-6 md:pb-8">
            <TimeEntryCreateForm
              key={createFormKey}
              departments={deptArr}
              clientsPicklist={clientsPick}
              tasksPicklist={tasksPick}
              defaultDepartmentKey={defaultDepartmentKey}
              submitting={createSubmitting}
              error={createError}
              onSubmit={handleCreate}
              onCancel={closeCreate}
              variant="modal"
            />
          </div>
        </div>
      </CrmDialog>

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <TimeSummaryStrip
          todayTotalMin={summary.todayTotalMin}
          billableMin={summary.billableMin}
          internalMin={summary.internalMin}
          entryCount={summary.entryCount}
          weekLoggedMin={summary.periodWeekdayLoggedMin}
          weekGoalMin={summary.periodGoalMin}
          periodCompareLabel={compareLabelDa}
        />

        <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.42fr)_minmax(280px,1fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]">
            <TimeMonthCalendar
              cells={calendarCells}
              dailyTargetMinutes={dailyTarget}
              periodCaption={calendarCaption || `Kalender`}
              periodSubtitle={subtitleForUi}
              selectedDayIso={stampListDayIso}
              onSelectDay={(iso) => setPickedDayIso(iso.trim().slice(0, 10))}
            />
            <TimeEntriesDirectory
              entriesToday={stampListEntries}
              todayTotalCount={stampListEntries.length}
              stampsHeading={stampsHeading}
            />
          </div>
          <TimeQuickLogPanel
            dataSource={dataSource}
            departments={deptArr}
            clientsPicklist={clientsPick}
            tasksPicklist={tasksPick}
            defaultDepartmentKey={defaultDepartmentKey}
            onCreated={load}
          />
        </div>
      </div>
    </div>
  );
}
