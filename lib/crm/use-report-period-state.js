"use client";

import { useCallback, useMemo, useState } from "react";

import {
  currentMonthSelection,
  formatReportPeriodSelectionSubtitle,
  normalizeReportPeriodSelection,
  primaryReportPeriod,
  reportPeriodSelectionToQueryParams,
} from "@/lib/crm/report-period";

/** @typedef {import('@/lib/crm/report-period').ReportPeriodSelection} ReportPeriodSelection */

/**
 * Shared report-period state for portfolio pages.
 * @param {ReportPeriodSelection | (() => ReportPeriodSelection)} [initial]
 */
export function useReportPeriodState(initial = currentMonthSelection) {
  const [selection, setSelectionRaw] = useState(initial);

  const normalized = useMemo(() => normalizeReportPeriodSelection(selection), [selection]);
  const primaryPeriod = useMemo(() => primaryReportPeriod(normalized), [normalized]);
  const queryParams = useMemo(() => reportPeriodSelectionToQueryParams(normalized), [normalized]);
  const subtitle = useMemo(() => formatReportPeriodSelectionSubtitle(normalized), [normalized]);

  const setSelection = useCallback((next) => {
    setSelectionRaw(normalizeReportPeriodSelection(next));
  }, []);

  return {
    selection: normalized,
    setSelection,
    primaryPeriod,
    queryParams,
    subtitle,
  };
}
