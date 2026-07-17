/** @typedef {{ year: number; month: number }} ReportPeriod */

export const MONTH_NAMES_DA = [
  "Januar",
  "Februar",
  "Marts",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "December",
];

const MONTH_NAMES_DA_LOWER = MONTH_NAMES_DA.map((m) => m.toLowerCase());

/** @returns {ReportPeriod} */
export function getCurrentReportPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function startOfReportMonth(year, month) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Exclusive end (first instant of next month).
 * @param {number} year
 * @param {number} month 1–12
 */
export function endOfReportMonth(year, month) {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

/**
 * Last calendar day (noon-aligned ISO date string) — used when comparing deadlines to a viewed month.
 * @param {number} year
 * @param {number} month 1–12
 */
export function lastCalendarDayIsoOfReportMonth(year, month) {
  const last = new Date(year, month, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, "0");
  const d = String(last.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} deltaMonths
 * @returns {ReportPeriod}
 */
export function shiftReportPeriod(year, month, deltaMonths) {
  const d = new Date(year, month - 1 + deltaMonths, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * @param {ReportPeriod} a
 * @param {ReportPeriod} b
 */
export function isSameReportPeriod(a, b) {
  return a.year === b.year && a.month === b.month;
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function isCurrentReportPeriod(year, month) {
  return isSameReportPeriod({ year, month }, getCurrentReportPeriod());
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function formatReportPeriodLabel(year, month) {
  const name = MONTH_NAMES_DA[month - 1] ?? "";
  return `${name} ${year}`;
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function formatReportPeriodSubtitle(year, month) {
  const name = MONTH_NAMES_DA_LOWER[month - 1] ?? "";
  return `${name} ${year}`;
}

/**
 * Latest selectable month (1–12) for a given year.
 * @param {number} year
 */
export function getMaxSelectableMonth(year) {
  const { year: cy, month: cm } = getCurrentReportPeriod();
  if (year < cy) return 12;
  if (year > cy) return 0;
  return cm;
}

/**
 * @param {number} [yearsBack=4]
 * @returns {number[]}
 */
export function getSelectableYears(yearsBack = 4) {
  const cy = getCurrentReportPeriod().year;
  const out = [];
  for (let y = cy; y >= cy - yearsBack; y -= 1) out.push(y);
  return out;
}

/**
 * Clamp to a valid past/current month.
 * @param {Partial<ReportPeriod>} period
 * @returns {ReportPeriod}
 */
export function normalizeReportPeriod(period) {
  const current = getCurrentReportPeriod();
  let year = Number(period.year) || current.year;
  let month = Number(period.month) || current.month;

  const minYear = current.year - 4;
  if (year < minYear) year = minYear;
  if (year > current.year) year = current.year;

  const maxMonth = getMaxSelectableMonth(year);
  if (month < 1) month = 1;
  if (month > maxMonth) month = maxMonth || 1;

  return { year, month };
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function canGoToNextPeriod(year, month) {
  const next = shiftReportPeriod(year, month, 1);
  const maxMonth = getMaxSelectableMonth(next.year);
  return next.year < getCurrentReportPeriod().year || (next.year === getCurrentReportPeriod().year && next.month <= maxMonth);
}

/**
 * @param {number} year
 * @param {number} month 1–12
 */
export function canGoToPrevPeriod(year, month) {
  const prev = shiftReportPeriod(year, month, -1);
  const minYear = getCurrentReportPeriod().year - 4;
  return prev.year >= minYear;
}

/**
 * @param {import('@/lib/crm/pulse-types').PulseReportPeriod | undefined} period
 */
export function resolveReportPeriod(period) {
  if (period?.year && period?.month) {
    return normalizeReportPeriod(period);
  }
  return getCurrentReportPeriod();
}

/** @typedef {{ months: ReportPeriod[] }} ReportPeriodSelection */

/** @typedef {{ id: string; label: string; build: () => ReportPeriod[] }} ReportPeriodPreset */

/**
 * @param {ReportPeriod} period
 * @returns {string}
 */
export function reportPeriodKey(period) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

/**
 * @param {string} key
 * @returns {ReportPeriod | null}
 */
export function parseReportPeriodKey(key) {
  const m = String(key).trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  return normalizeReportPeriod({ year: Number(m[1]), month: Number(m[2]) });
}

/**
 * @param {ReportPeriod[]} months
 * @returns {ReportPeriod[]}
 */
export function sortReportPeriods(months) {
  return [...months].sort((a, b) => a.year - b.year || a.month - b.month);
}

/**
 * @param {ReportPeriod[]} months
 * @returns {ReportPeriod[]}
 */
export function uniqueReportPeriods(months) {
  const seen = new Set();
  /** @type {ReportPeriod[]} */
  const out = [];
  for (const p of months) {
    const norm = normalizeReportPeriod(p);
    const key = reportPeriodKey(norm);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return sortReportPeriods(out);
}

/** @returns {ReportPeriodSelection} */
export function currentMonthSelection() {
  return { months: [getCurrentReportPeriod()] };
}

/**
 * @param {Partial<ReportPeriodSelection> | ReportPeriod | null | undefined} input
 * @returns {ReportPeriodSelection}
 */
export function normalizeReportPeriodSelection(input) {
  if (input && "months" in input && Array.isArray(input.months)) {
    const months = uniqueReportPeriods(
      input.months.map((p) => normalizeReportPeriod(p)).filter((p) => p.month >= 1),
    );
    if (months.length) return { months };
    return currentMonthSelection();
  }
  if (input && "year" in input && "month" in input) {
    return { months: [normalizeReportPeriod(input)] };
  }
  return currentMonthSelection();
}

/**
 * Latest month in selection — used as calendar anchor / primary snapshot month.
 * @param {ReportPeriodSelection | ReportPeriod[] | null | undefined} input
 * @returns {ReportPeriod}
 */
export function primaryReportPeriod(input) {
  const months =
    Array.isArray(input) ? input
    : input && "months" in input ? input.months
    : [];
  const sorted = sortReportPeriods(months.map((p) => normalizeReportPeriod(p)));
  return sorted[sorted.length - 1] ?? getCurrentReportPeriod();
}

/**
 * @param {ReportPeriodSelection} selection
 */
export function isCurrentMonthSelection(selection) {
  const normalized = normalizeReportPeriodSelection(selection);
  return (
    normalized.months.length === 1 &&
    isCurrentReportPeriod(normalized.months[0].year, normalized.months[0].month)
  );
}

/**
 * @param {ReportPeriod[]} months
 */
export function periodsToInclusiveDateRange(months) {
  const sorted = sortReportPeriods(months.map((p) => normalizeReportPeriod(p)));
  const first = sorted[0] ?? getCurrentReportPeriod();
  const last = sorted[sorted.length - 1] ?? first;
  const fromIso = `${first.year}-${String(first.month).padStart(2, "0")}-01`;
  const toIso = lastCalendarDayIsoOfReportMonth(last.year, last.month);
  return { fromIso, toIso, first, last };
}

/**
 * @param {ReportPeriodSelection | ReportPeriod[] | null | undefined} input
 */
export function formatReportPeriodSelectionLabel(input) {
  const normalized = normalizeReportPeriodSelection(
    Array.isArray(input) ? { months: input } : input,
  );
  const { months } = normalized;
  if (months.length === 0) return formatReportPeriodLabel(getCurrentReportPeriod().year, getCurrentReportPeriod().month);
  if (months.length === 1) {
    const p = months[0];
    return formatReportPeriodLabel(p.year, p.month);
  }
  const sorted = sortReportPeriods(months);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.year === last.year) {
    if (first.month === 1 && last.month === getMaxSelectableMonth(last.year)) {
      return `Hele ${last.year}`;
    }
    const firstShort = MONTH_NAMES_DA[first.month - 1]?.slice(0, 3) ?? "";
    const lastShort = MONTH_NAMES_DA[last.month - 1]?.slice(0, 3) ?? "";
    return `${firstShort}–${lastShort} ${last.year}`;
  }
  return `${formatReportPeriodLabel(first.year, first.month)} – ${formatReportPeriodLabel(last.year, last.month)}`;
}

/**
 * @param {ReportPeriodSelection | ReportPeriod[] | null | undefined} input
 */
export function formatReportPeriodSelectionSubtitle(input) {
  const normalized = normalizeReportPeriodSelection(
    Array.isArray(input) ? { months: input } : input,
  );
  const { months } = normalized;
  if (months.length === 0) {
    return formatReportPeriodSubtitle(getCurrentReportPeriod().year, getCurrentReportPeriod().month);
  }
  if (months.length === 1) {
    const p = months[0];
    return formatReportPeriodSubtitle(p.year, p.month);
  }
  const sorted = sortReportPeriods(months);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.year === last.year) {
    const firstName = MONTH_NAMES_DA_LOWER[first.month - 1] ?? "";
    const lastName = MONTH_NAMES_DA_LOWER[last.month - 1] ?? "";
    return `${firstName}–${lastName} ${last.year} · ${months.length} måneder`;
  }
  return `${months.length} måneder · ${formatReportPeriodLabel(first.year, first.month)} – ${formatReportPeriodLabel(last.year, last.month)}`;
}

/**
 * @param {number} count
 * @param {ReportPeriod} [anchor]
 */
export function buildLastNMonthsSelection(count, anchor = getCurrentReportPeriod()) {
  /** @type {ReportPeriod[]} */
  const months = [];
  let y = anchor.year;
  let m = anchor.month;
  for (let i = 0; i < count; i += 1) {
    months.push(normalizeReportPeriod({ year: y, month: m }));
    const prev = shiftReportPeriod(y, m, -1);
    y = prev.year;
    m = prev.month;
  }
  return { months: sortReportPeriods(months) };
}

/** @returns {ReportPeriod[]} */
export function buildYearToDateMonths(year = getCurrentReportPeriod().year) {
  const current = getCurrentReportPeriod();
  const maxMonth = year < current.year ? 12 : year > current.year ? 0 : current.month;
  /** @type {ReportPeriod[]} */
  const months = [];
  for (let m = 1; m <= maxMonth; m += 1) {
    months.push({ year, month: m });
  }
  return months;
}

/** @returns {ReportPeriodPreset[]} */
export function getReportPeriodPresets() {
  return [
    {
      id: "this_month",
      label: "Denne måned",
      build: () => [getCurrentReportPeriod()],
    },
    {
      id: "last_month",
      label: "Sidste måned",
      build: () => {
        const p = shiftReportPeriod(getCurrentReportPeriod().year, getCurrentReportPeriod().month, -1);
        return [p];
      },
    },
    {
      id: "ytd",
      label: "I år til dato",
      build: () => buildYearToDateMonths(getCurrentReportPeriod().year),
    },
    {
      id: "last_3",
      label: "Sidste 3 måneder",
      build: () => buildLastNMonthsSelection(3).months,
    },
    {
      id: "last_6",
      label: "Sidste 6 måneder",
      build: () => buildLastNMonthsSelection(6).months,
    },
    {
      id: "last_12",
      label: "Sidste 12 måneder",
      build: () => buildLastNMonthsSelection(12).months,
    },
    {
      id: "last_year",
      label: "Sidste år",
      build: () => {
        const y = getCurrentReportPeriod().year - 1;
        /** @type {ReportPeriod[]} */
        const months = [];
        for (let m = 1; m <= 12; m += 1) months.push({ year: y, month: m });
        return months;
      },
    },
  ];
}

/**
 * @param {ReportPeriodSelection} selection
 * @returns {Record<string, string>}
 */
export function reportPeriodSelectionToQueryParams(selection) {
  const normalized = normalizeReportPeriodSelection(selection);
  if (normalized.months.length === 1) {
    const p = normalized.months[0];
    return { year: String(p.year), month: String(p.month) };
  }
  const range = periodsToInclusiveDateRange(normalized.months);
  return {
    from: range.fromIso,
    to: range.toIso,
    months: normalized.months.map(reportPeriodKey).join(","),
    year: String(range.last.year),
    month: String(range.last.month),
  };
}

/**
 * @param {ReportPeriodSelection} a
 * @param {ReportPeriodSelection} b
 */
export function isSameReportPeriodSelection(a, b) {
  const na = normalizeReportPeriodSelection(a);
  const nb = normalizeReportPeriodSelection(b);
  if (na.months.length !== nb.months.length) return false;
  const keysA = na.months.map(reportPeriodKey).join("|");
  const keysB = nb.months.map(reportPeriodKey).join("|");
  return keysA === keysB;
}

