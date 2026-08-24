import { endOfReportMonth, normalizeReportPeriod, startOfReportMonth } from "@/lib/crm/report-period";

export const TASK_TERMINAL_STATUSES = /** @type {const} */ (["done", "cancelled"]);

/**
 * Portfolio query — forfaldsdato i måneden, eller åben uden/forfaldsdato før måned —
 * eller hvilken status som helst hvor kun forfald ligger i måneden (inkl. færdig).
 */
export function buildTasksPortfolioMongoFilter(year, month) {
  const ms = startOfReportMonth(year, month);
  const me = endOfReportMonth(year, month);
  return {
    $or: [
      { dueDate: { $gte: ms, $lt: me } },
      {
        status: { $nin: TASK_TERMINAL_STATUSES },
        $or: [{ dueDate: { $lt: ms } }, { dueDate: null }, { dueDate: { $exists: false } }],
      },
    ],
  };
}

/**
 * Union of portfolio filters across multiple report months (e.g. "Sidste 12 måneder").
 * @param {Array<{ year: number; month: number }>} periods
 */
export function buildTasksPortfolioMongoFilterForPeriods(periods) {
  if (!periods?.length) {
    const now = normalizeReportPeriod({});
    return buildTasksPortfolioMongoFilter(now.year, now.month);
  }
  if (periods.length === 1) {
    return buildTasksPortfolioMongoFilter(periods[0].year, periods[0].month);
  }
  /** @type {Record<string, unknown>[]} */
  const branches = [];
  for (const period of periods) {
    branches.push(...buildTasksPortfolioMongoFilter(period.year, period.month).$or);
  }
  return { $or: branches };
}

/** Samme semantik som `buildTasksPortfolioMongoFilter`, evalueret over flere måneder. */
export function portfolioRowIncludedInAnyMonth(task, periods) {
  if (!periods?.length) return false;
  return periods.some((p) => portfolioRowIncludedInMonth(task, p.year, p.month));
}

/** @param {string} iso YYYY-MM-DD */
function isoToStartOfUtcDayMs(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Samme semantik som `buildTasksPortfolioMongoFilter`.
 * @param {{ dueDate?: string | null | undefined; status: string }} task
 */
export function portfolioRowIncludedInMonth(task, year, month) {
  const ms = startOfReportMonth(year, month).getTime();
  const me = endOfReportMonth(year, month).getTime();
  const dueIso = typeof task.dueDate === "string" ? task.dueDate : "";
  const dueMs = dueIso ? isoToStartOfUtcDayMs(dueIso) : null;
  const terminal = TASK_TERMINAL_STATUSES.includes(task.status);

  const dueInMonth = dueMs !== null && dueMs >= ms && dueMs < me;
  const backlogBranch =
    !terminal && (dueIso === "" || dueMs === null || (dueMs !== null && dueMs < ms));
  return dueInMonth || backlogBranch;
}
