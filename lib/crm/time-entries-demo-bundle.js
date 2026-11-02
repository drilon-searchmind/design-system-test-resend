import { annotateClientsWithGroups } from "@/lib/crm/client-groups";
import { TASK_DEMO_REF_DATE, TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import {
  resolveTimeWeekOverview,
  minutesPerUtcIsoDayFromWireEntries,
  timeMonthGoalMinutes,
  buildReportMonthCalendarCells,
} from "@/lib/crm/time-utils";
import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import {
  CLIENTS,
  DEPARTMENTS,
  TASKS,
  TEAM,
  TIME_DAILY_TARGET_MINUTES,
  TIME_ENTRIES_TODAY,
  TIME_WEEK_OVERVIEW,
} from "@/lib/crm/static-data";

/** @returns {{ id: string; name: string; short: string; color: string }[]} */
export function getTimeEntriesDemoDepartments() {
  return DEPARTMENTS.map((d) => ({
    id: d.id,
    name: d.name,
    short: d.short,
    color: typeof d.color === "string" ? d.color : "var(--dep-seo)",
  }));
}

/**
 * @param {string} dayIso YYYY-MM-DD
 * @param {string} atHm fx "09:15"
 */
function demoWorkedIso(dayIso, atHm) {
  const raw = `${atHm || "12:00"}`;
  const [hh, mm] = raw.split(":").map((x) => String(x ?? "0"));
  const h = hh.padStart(2, "0").slice(-2);
  const mi = mm.padStart(2, "0").slice(-2);
  const dnum = `${dayIso}T${h}:${mi}:00`;
  return new Date(dnum).toISOString();
}

/**
 * Mapper demo-entry til liste-wire (matcher Mongo-build).
 *
 * @param {typeof TIME_ENTRIES_TODAY[number]} e
 */
function mapDemoEntryWire(e) {
  const bill = e.client != null && e.client !== "";
  const clientRow = e.client ? CLIENTS.find((c) => c.id === e.client) ?? null : null;
  const taskRow = e.task ? TASKS.find((t) => t.id === e.task) ?? null : null;

  const workedIso = demoWorkedIso(TASK_DEMO_REF_DATE, e.at);

  return {
    id: e.id,
    mongoId: "",
    at: e.at,
    workedAtIso: workedIso,
    durationMinutes: e.dur,
    clientSlug: e.client ?? null,
    clientName:
      typeof clientRow?.name === "string" ? clientRow.name : e.client ?? null ?
        String(e.client)
      : null,
    taskKey: taskRow?.id ?? (e.task || null),
    taskTitle:
      typeof taskRow?.title === "string"
        ? taskRow.title
        : e.task
          ? String(e.task)
          : null,
    dept: typeof e.dept === "string" ? e.dept : null,
    billable: bill,
    desc: typeof e.desc === "string" ? e.desc : "",
    source:
      /** @type {"manual" | "timer"} */ ("manual"),
  };
}

/** @returns {{ value: string; label: string }[]} */
export function getTimeEntriesDemoClientsPicklist() {
  return annotateClientsWithGroups(CLIENTS)
    .map((c) => ({
      value: String(c.id),
      label: String(c.name ?? c.id ?? "—"),
      ...(c.groupName ? { group: c.groupName } : {}),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "da"));
}

/** @returns {{ value: string; label: string; clientSlug: string }[]} */
export function getTimeEntriesDemoTasksPicklist() {
  return TASKS.map((t) => ({
    value: String(t.id),
    label: String(t.title ?? "—"),
    clientSlug:
      CLIENTS.some((c) => c.id === t.clientId) ? String(t.clientId ?? "") : String(t.clientId ?? ""),
  })).sort((a, b) => a.label.localeCompare(b.label, "da"));
}

/**
 * @param {{ year?: number; month?: number } | undefined} [periodIn]
 */
export function getTimeEntriesDemoBundle(periodIn = undefined) {
  const reportPeriod = normalizeReportPeriod({
    year: periodIn?.year,
    month: periodIn?.month,
  });

  const fromIso =
    `${reportPeriod.year}-${String(reportPeriod.month).padStart(2, "0")}-01`;
  const toIso = lastCalendarDayIsoOfReportMonth(reportPeriod.year, reportPeriod.month);

  const refSlice = TASK_DEMO_REF_DATE.trim().slice(0, 10);
  const demoDataMonth =
    refSlice.startsWith(`${reportPeriod.year}-${String(reportPeriod.month).padStart(2, "0")}`);

  const entries =
    demoDataMonth ?
      [...TIME_ENTRIES_TODAY].reverse().map(mapDemoEntryWire).filter((wire) => {
        const iso = typeof wire.workedAtIso === "string" ? wire.workedAtIso.slice(0, 10) : "";
        return !!iso && iso >= fromIso && iso <= toIso;
      })
    : [];

  /** @type {Record<string, number>} */
  let totalsIso = {};

  if (demoDataMonth) {
    const weekResolved = resolveTimeWeekOverview(TIME_WEEK_OVERVIEW, TIME_ENTRIES_TODAY);
    for (const row of weekResolved) {
      const iso = typeof row.iso === "string" ? row.iso.slice(0, 10) : "";
      if (!iso || iso < fromIso || iso > toIso) continue;
      const m =
        row.minutes == null ? TIME_ENTRIES_TODAY.reduce((s, e) => s + Number(e.dur || 0), 0)
        : typeof row.minutes === "number" ?
          row.minutes
        : Number(row.minutes);

      totalsIso[iso] = Number.isFinite(m) ? Math.round(m) : 0;
    }
  }

  const fromWire = minutesPerUtcIsoDayFromWireEntries(entries);
  const mergedTotals = /** @type {Record<string, number>} */ ({ ...totalsIso });
  for (const iso of Object.keys(fromWire)) {
    const wi = Number(fromWire[iso]);
    mergedTotals[iso] = Math.max(mergedTotals[iso] ?? 0, Number.isFinite(wi) ? Math.round(wi) : 0);
  }

  const periodGoalMinutes = timeMonthGoalMinutes(
    reportPeriod.year,
    reportPeriod.month,
    TIME_DAILY_TARGET_MINUTES,
  );

  const periodLoggedMinutes = entries.reduce((s, e) => {
    const n = typeof e.durationMinutes === "number" ? e.durationMinutes : Number(e.durationMinutes);
    return Number.isFinite(n) ? s + Math.round(n) : s;
  }, 0);

  const calendarCells = buildReportMonthCalendarCells(
    reportPeriod.year,
    reportPeriod.month,
    mergedTotals,
    TASK_DEMO_REF_DATE.trim().slice(0, 10),
  );

  const mineName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";
  const periodCaption = `${formatReportPeriodLabel(reportPeriod.year, reportPeriod.month)}`;

  return {
    source: /** @type {const} */ ("demo"),
    fromIso,
    toIso,
    reportPeriod: { year: reportPeriod.year, month: reportPeriod.month },
    periodLabel: periodCaption,
    periodSubtitle: formatReportPeriodSubtitle(reportPeriod.year, reportPeriod.month),
    calendarCaption: `Kalender · ${periodCaption}`,
    mineLabel: mineName,
    dailyTargetMinutes: TIME_DAILY_TARGET_MINUTES,
    weekGoalMinutes: periodGoalMinutes,
    periodGoalMinutes,
    /** Minutter på synlig måned vs. mål udregnet ud fra arbd. mandag–fre */
    periodLoggedMinutes,
    /** @deprecated synonym */
    weekLoggedMinFromRange: periodLoggedMinutes,
    todayKey: TASK_DEMO_REF_DATE.trim().slice(0, 10),
    calendarCells,
    entries,
    departments: getTimeEntriesDemoDepartments(),
    clientsPicklist: getTimeEntriesDemoClientsPicklist(),
    tasksPicklist: getTimeEntriesDemoTasksPicklist(),
    /** @deprecated */
    weekCaption: `Måned · ${periodCaption}`,
  };
}

/**
 * @param {string} entryId Demo-stempels `e.id`.
 */
export function getTimeEntryDemoDetail(entryId) {
  const e = TIME_ENTRIES_TODAY.find((x) => x.id === entryId);
  if (!e) return null;

  const mapped = mapDemoEntryWire(e);

  const activityEntries = [
    {
      id: `${mapped.id}-demo`,
      at: mapped.workedAtIso,
      kind: "Demo",
      summary: "Statisk post fra lib/crm/static-data.js.",
    },
  ];

  return {
    source: /** @type {const} */ ("demo"),
    entry: mapped,
    departments: getTimeEntriesDemoDepartments(),
    clientsPicklist: getTimeEntriesDemoClientsPicklist(),
    tasksPicklist: getTimeEntriesDemoTasksPicklist(),
    activityEntries,
  };
}
