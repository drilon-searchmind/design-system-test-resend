"use client";

import { useCallback, useMemo } from "react";

import {
  currentMonthSelection,
  formatReportPeriodSelectionSubtitle,
  normalizeReportPeriodSelection,
  primaryReportPeriod,
  reportPeriodSelectionToQueryParams,
} from "@/lib/crm/report-period";
import { usePersistedState } from "@/lib/use-persisted-state";

/** @typedef {import('@/lib/crm/report-period').ReportPeriodSelection} ReportPeriodSelection */

/** One shared key: the chosen month(s) follow the user across Pulse, Kunder, Opgaver, Tid, Team, Workload. */
export const REPORT_PERIOD_STORAGE_KEY = "crm:report-period:v1";

/** @param {unknown} value */
function validateStoredSelection(value) {
  const v = /** @type {any} */ (value);
  return v && Array.isArray(v.months) && v.months.length ? normalizeReportPeriodSelection(v) : null;
}

/**
 * Shared report-period state for portfolio pages.
 * @param {ReportPeriodSelection | (() => ReportPeriodSelection)} [initial]
 * @param {string | null} [storageKey] localStorage key; defaults to the app-wide shared key, pass null to opt out
 */
export function useReportPeriodState(initial = currentMonthSelection, storageKey = REPORT_PERIOD_STORAGE_KEY) {
  const [selection, setSelectionRaw] = usePersistedState(storageKey, initial, {
    validate: validateStoredSelection,
  });

  const normalized = useMemo(() => normalizeReportPeriodSelection(selection), [selection]);
  const primaryPeriod = useMemo(() => primaryReportPeriod(normalized), [normalized]);
  const queryParams = useMemo(() => reportPeriodSelectionToQueryParams(normalized), [normalized]);
  const subtitle = useMemo(() => formatReportPeriodSelectionSubtitle(normalized), [normalized]);

  const setSelection = useCallback(
    (next) => {
      setSelectionRaw(normalizeReportPeriodSelection(next));
    },
    [setSelectionRaw],
  );

  return {
    selection: normalized,
    setSelection,
    primaryPeriod,
    queryParams,
    subtitle,
  };
}
