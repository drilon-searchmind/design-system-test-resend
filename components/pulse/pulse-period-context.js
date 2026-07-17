"use client";

import { createContext, useContext, useMemo } from "react";

import {
  formatReportPeriodSelectionSubtitle,
  isCurrentMonthSelection,
  normalizeReportPeriodSelection,
  primaryReportPeriod,
} from "@/lib/crm/report-period";

/** @typedef {import('@/lib/crm/report-period').ReportPeriodSelection} ReportPeriodSelection */

/** @typedef {{
 *   selection: ReportPeriodSelection;
 *   primaryPeriod: import('@/lib/crm/report-period').ReportPeriod;
 *   label: string;
 *   subtitle: string;
 *   isCurrent: boolean;
 *   onSelectionChange: (selection: ReportPeriodSelection) => void;
 *   refreshing?: boolean;
 * }} PulsePeriodContextValue */

/** @type {import('react').Context<PulsePeriodContextValue | null>} */
const PulsePeriodContext = createContext(null);

/**
 * @param {{
 *   selection: ReportPeriodSelection;
 *   onSelectionChange: (selection: ReportPeriodSelection) => void;
 *   refreshing?: boolean;
 *   children: import('react').ReactNode;
 * }} props
 */
export function PulsePeriodProvider({ selection, onSelectionChange, refreshing = false, children }) {
  const normalized = useMemo(() => normalizeReportPeriodSelection(selection), [selection]);
  const primaryPeriod = useMemo(() => primaryReportPeriod(normalized), [normalized]);

  const value = useMemo(
    () => ({
      selection: normalized,
      primaryPeriod,
      label: formatReportPeriodSelectionSubtitle(normalized),
      subtitle: formatReportPeriodSelectionSubtitle(normalized),
      isCurrent: isCurrentMonthSelection(normalized),
      onSelectionChange,
      refreshing,
    }),
    [normalized, primaryPeriod, onSelectionChange, refreshing],
  );

  return <PulsePeriodContext.Provider value={value}>{children}</PulsePeriodContext.Provider>;
}

/** @returns {PulsePeriodContextValue} */
export function usePulsePeriod() {
  const ctx = useContext(PulsePeriodContext);
  if (!ctx) {
    throw new Error("usePulsePeriod must be used within PulsePeriodProvider");
  }
  return ctx;
}
