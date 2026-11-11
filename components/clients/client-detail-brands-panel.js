"use client";

import Link from "next/link";
import { useState } from "react";

import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { formatCurrencyCompact, formatHoursBudgetPairDa } from "@/lib/crm/format-da";

/**
 * Brands under en kundegruppe. Hvert brand er en selvstændig kunde (opgaver, timer, kontrakter),
 * men MRR og nøgletal samles på kundegruppen.
 *
 * @param {{
 *   brands: Array<Record<string, any>>;
 *   groupName: string;
 *   currency: string;
 *   totalRetainer: number;
 *   onUngroup?: (brandSlug: string) => Promise<void>;
 * }} props
 */
export function ClientDetailBrandsPanel({ brands, groupName, currency, totalRetainer, onUngroup }) {
  const [busySlug, setBusySlug] = useState(/** @type {string | null} */ (null));

  async function ungroup(brand) {
    if (!onUngroup) return;
    const ok = window.confirm(
      `Løsriv ${brand.name} fra ${groupName}?\n\nBrandet står igen som en selvstændig kunde (CVR bevares). Opgaver, timer og kontrakter påvirkes ikke.`,
    );
    if (!ok) return;
    setBusySlug(brand.id);
    try {
      await onUngroup(brand.id);
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <article className="tally-panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Brands i {groupName}
          </h3>
          <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
            {brands.length} brands · samlet MRR{" "}
            <span className="tabular-nums text-fg">{formatCurrencyCompact(totalRetainer, currency)}</span>
          </p>
        </div>
      </div>

      <ul>
        {brands.map((b) => {
          const share = totalRetainer > 0 ? Math.round((b.retainer / totalRetainer) * 100) : 0;
          return (
            <li
              key={b.id}
              className="grid items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:px-5"
            >
              <Link
                href={`${routes.clients}/${encodeURIComponent(b.id)}`}
                className="flex min-w-0 items-center gap-2.5 hover:underline"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-[11px] font-semibold text-white"
                  style={{ background: `oklch(62% 0.14 ${b.hue})` }}
                >
                  {b.logo}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-sans text-[13px] font-medium text-fg">{b.name}</span>
                  <span className="block truncate font-sans text-[11px] text-fg-quiet">{b.industry}</span>
                </span>
              </Link>

              <div className="flex items-center gap-1.5">
                <StatusChip status={b.status} palette="agency" className="scale-95 origin-left" />
                <HealthChip health={b.health} palette="agency" compact />
              </div>

              <div>
                <div className="text-[13px] tabular-nums text-fg">
                  {formatCurrencyCompact(b.retainer, b.currency)}
                </div>
                <div className="text-[10.5px] tabular-nums text-fg-quiet">{share}% af MRR</div>
              </div>

              <div>
                <div className="flex justify-between font-sans text-[11px] text-fg-muted">
                  <span>Timer</span>
                  <span className="tabular-nums">
                    {formatHoursBudgetPairDa(b.hoursThisMonth, b.hoursBudget)}
                  </span>
                </div>
                <PulseUtilBar hours={b.hoursThisMonth} budget={b.hoursBudget} className="mt-1" />
              </div>

              <div className="flex justify-end">
                {onUngroup ?
                  <button
                    type="button"
                    disabled={busySlug === b.id}
                    onClick={() => void ungroup(b)}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 font-sans text-[11.5px] font-medium text-fg-muted transition-colors hover:border-agency-bad-border hover:text-agency-bad disabled:opacity-40"
                  >
                    {busySlug === b.id ? "Løsriver…" : "Løsriv"}
                  </button>
                : null}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
