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

/** @param {unknown} value */
function validateStoredSelection(value) {
  const v = /** @type {any} */ (value);
  return v && Array.isArray(v.months) && v.months.length ? normalizeReportPeriodSelection(v) : null;
}

/**
 * Shared report-period state for portfolio pages.
 * @param {ReportPeriodSelection | (() => ReportPeriodSelection)} [initial]
 * @param {string | null} [storageKey] when set, the selection survives reloads (localStorage)
 */
export function useReportPeriodState(initial = currentMonthSelection, storageKey = null) {
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
