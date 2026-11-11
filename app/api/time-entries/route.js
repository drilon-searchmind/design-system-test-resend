import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { createTimeEntryMongo, fetchTimeEntriesPortfolio } from "@/lib/server/time-entries-data";
import { requireSession } from "@/lib/server/require-session";
import {
  buildReportMonthCalendarCells,
  minutesPerUtcIsoDayFromWireEntries,
  timeMonthGoalMinutes,
} from "@/lib/crm/time-utils";
import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  getCurrentReportPeriod,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";

/**
 * GET /api/time-entries — poster i et kalendermåned (`year`/`month`), eller eksplicit `from`…`to` (YYYY-MM-DD, ink.).
 *
 * Mangler måned OG datointerval: default er **aktuelt rapportår/måned** (samme som Opgaver).
 *
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  /** @typedef {{ year: number; month: number }} RP */
  /** @type {RP | null} */
  let resolvedPeriod = null;

  let fromIso =
    typeof req.nextUrl.searchParams.get("from") === "string" ?
      req.nextUrl.searchParams.get("from").trim().slice(0, 10)
    : "";
  let toIso =
    typeof req.nextUrl.searchParams.get("to") === "string" ?
      req.nextUrl.searchParams.get("to").trim().slice(0, 10)
    : "";

  const yearRaw = req.nextUrl.searchParams.get("year");
  const monthRaw = req.nextUrl.searchParams.get("month");
  const hasYearMonthParams = typeof yearRaw === "string" || typeof monthRaw === "string";

  if (!fromIso || !toIso) {
    if (hasYearMonthParams) {
      resolvedPeriod = normalizeReportPeriod({
        year: typeof yearRaw === "string" ? Number(yearRaw) : undefined,
        month: typeof monthRaw === "string" ? Number(monthRaw) : undefined,
      });
      fromIso =
        `${resolvedPeriod.year}-${String(resolvedPeriod.month).padStart(2, "0")}-${"01"}`.slice(0, 10);
      toIso = lastCalendarDayIsoOfReportMonth(resolvedPeriod.year, resolvedPeriod.month);
    } else {
      resolvedPeriod = normalizeReportPeriod(getCurrentReportPeriod());
      fromIso =
        `${resolvedPeriod.year}-${String(resolvedPeriod.month).padStart(2, "0")}-${"01"}`.slice(0, 10);
      toIso = lastCalendarDayIsoOfReportMonth(resolvedPeriod.year, resolvedPeriod.month);
    }
  }

  /** @type {RP | null} */
  let reportPeriodMeta = resolvedPeriod;

  try {
    const raw = /** @type {Record<string, unknown>} */ (
      await fetchTimeEntriesPortfolio({
        session: authResult.session,
        includeTest,
        fromIso,
        toIso,
      })
    );

    if (typeof raw.error === "string" && raw.error) {
      return NextResponse.json({ error: raw.error }, { status: typeof raw.status === "number" ? raw.status : 400 });
    }

    /** @type {{ durationMinutes?: number; workedAtIso?: string | null }[]} */
    const entries = Array.isArray(raw.entries) ?
      /** @type {{ durationMinutes?: number; workedAtIso?: string | null }[]} */ (
        raw.entries
      )
    : [];

    /** @type {string} */
    const todayKey = typeof raw.todayKey === "string" ? raw.todayKey.trim().slice(0, 10) : "";

    /** @typedef {{ month: number; year: number }} RP2 */
    if (!reportPeriodMeta) {
      const f = typeof raw.fromIso === "string" ? raw.fromIso.trim().slice(0, 10) : "";
      const t = typeof raw.toIso === "string" ? raw.toIso.trim().slice(0, 10) : "";
      if (f.length >= 10) {
        const y = Number(f.slice(0, 4));
        const m = Number(f.slice(5, 7));
        if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12)
          /** @type {RP2} */ (reportPeriodMeta = { year: y, month: m });
      }
      if (!reportPeriodMeta && t.length >= 10) {
        const y = Number(t.slice(0, 4));
        const m = Number(t.slice(5, 7));
        if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12)
          /** @type {RP2} */ (reportPeriodMeta = { year: y, month: m });
      }
      if (!reportPeriodMeta && todayKey.length >= 10) {
        const y = Number(todayKey.slice(0, 4));
        const m = Number(todayKey.slice(5, 7));
        if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12)
          reportPeriodMeta = { year: y, month: m };
      }
      if (!reportPeriodMeta) {
        reportPeriodMeta = normalizeReportPeriod(getCurrentReportPeriod());
      }
    }

    reportPeriodMeta = normalizeReportPeriod(reportPeriodMeta);

    const totals = minutesPerUtcIsoDayFromWireEntries(entries);

    const dailyTarget =
      typeof raw.dailyTargetMinutes === "number" && Number.isFinite(raw.dailyTargetMinutes) ?
        raw.dailyTargetMinutes
      : 0;

    const periodLoggedMinFromRange = entries.reduce((s, row) => {
      const m =
        typeof row.durationMinutes === "number" ?
          row.durationMinutes
        : typeof row.durationMinutes === "undefined" ?
          NaN
        : Number(row.durationMinutes);
      return Number.isFinite(m) ? s + Math.round(m) : s;
    }, 0);

    const calendarCells = buildReportMonthCalendarCells(
      reportPeriodMeta.year,
      reportPeriodMeta.month,
      totals,
      todayKey,
    );

    const periodGoalMinutes = timeMonthGoalMinutes(
      reportPeriodMeta.year,
      reportPeriodMeta.month,
      dailyTarget,
    );

    const periodCaption = `${formatReportPeriodLabel(reportPeriodMeta.year, reportPeriodMeta.month)}`;

    /** @deprecated Brug calendarCells + rapportmåned; bevaret for klientfelter der forventede "uge". */
    const legacyWeekCaption = `Måned · ${periodCaption}`;
    /** @deprecated Bruges af ældre KPI-prop navne */
    const weekLoggedMinFromRangeLegacy = periodLoggedMinFromRange;
    /** @deprecated periodGoalMinutes / weekGoalMinutes peger samme sted ved måneds-navigation */
    const weekGoalLegacy = periodGoalMinutes;

    return NextResponse.json({
      ...raw,
      entries,
      reportPeriod: { year: reportPeriodMeta.year, month: reportPeriodMeta.month },
      periodLabel: formatReportPeriodLabel(reportPeriodMeta.year, reportPeriodMeta.month),
      periodSubtitle: formatReportPeriodSubtitle(reportPeriodMeta.year, reportPeriodMeta.month),
      calendarCaption: `Kalender · ${periodCaption}`,
      calendarCells,
      /** @deprecated */
      weekCaption: legacyWeekCaption,
      /** Minutes samlet inden for måned eller custom `from`…`to` */
      periodLoggedMinutes: periodLoggedMinFromRange,
      periodGoalMinutes,
      calendarCellsDailyTargetMinutes: dailyTarget,
      weekLoggedMinFromRange: weekLoggedMinFromRangeLegacy,
      weekGoalMinutes: weekGoalLegacy,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente registreringer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  try {
    const res = await createTimeEntryMongo(authResult.session, body, includeTest === true);

    if (res && typeof res === "object" && "error" in res && typeof res.error === "string") {
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette registrering";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
