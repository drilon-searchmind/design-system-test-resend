"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { IndeksValue, NpsValue } from "@/components/clients/client-metric-cells";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { buildCustomerEntities, customerHref } from "@/lib/crm/client-groups";
import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { clientHealthBreakdown, MIN_HEALTH_PARTS } from "@/lib/crm/client-metrics";
import { formatHoursBudgetPairDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-[26px_minmax(0,1fr)_44px_52px_84px_40px] items-center gap-2";

/**
 * Forklaring af en sundhedsscore: rå værdi, delscore og vægt pr. komponent + selve udregningen.
 * @param {{ breakdown: import("@/lib/crm/client-metrics").HealthBreakdown }} props
 */
function HealthScoreExplanation({ breakdown }) {
  const used = breakdown.parts.filter((p) => p.score != null && p.weight > 0);
  const wSum = used.reduce((s, p) => s + p.weight, 0);
  return (
    <div className="space-y-2 text-[12px] leading-snug text-fg-muted">
      {breakdown.parts.map((p) => {
        const included = p.score != null && p.weight > 0;
        return (
          <div key={p.key} className={cn(!included && "opacity-60")}>
            <p className="flex justify-between gap-3">
              <span className="font-medium text-fg">
                {p.label}{" "}
                <span className="font-normal text-fg-quiet">
                  {included ? `(vægt ${p.weightPct} %)` : "(indgår ikke)"}
                </span>
              </span>
              <span className="font-semibold tabular-nums text-fg">{p.score ?? "–"}</span>
            </p>
            <p className="text-[11px] text-fg-quiet">
              Værdi: <span className="tabular-nums text-fg-muted">{p.raw}</span> · {p.rule}
            </p>
            {p.note ?
              <p className="text-[11px] tabular-nums text-fg-quiet">{p.note}</p>
            : null}
          </div>
        );
      })}
      <p className="border-t border-border-muted pt-1.5 tabular-nums">
        {breakdown.total == null ?
          `Kun ${breakdown.usedCount} af 3 komponenter har data — der kræves mindst ${MIN_HEALTH_PARTS} for en score.`
        : <>
            ({used.map((p) => `${p.score} × ${p.weight}`).join(" + ")}) ÷ {wSum} ={" "}
            <span className="font-semibold text-fg">{breakdown.total}</span>
          </>
        }
      </p>
      {breakdown.total != null && breakdown.usedCount < 3 ?
        <p className="text-[11px] text-fg-quiet">
          Manglende data udelades, og vægtene fordeles på de {breakdown.usedCount} komponenter med data.
        </p>
      : null}
    </div>
  );
}

/**
 * Sunde / usunde kunder ud fra Indeks, NPS og tidsforbrug ift. timebudget.
 * Alle aktive kunder med en score fordeles på de to lister ved grænsen for "sund"
 * (ingen kunde står i begge), sorteret bedst → dårligst hhv. dårligst → bedst, med sider.
 *
 * @param {{ kind: 'healthy' | 'unhealthy' }} props
 */
export function PulseClientRanking({ kind }) {
  const { clients, agencySettings, period } = usePulseData();
  const settings = agencySettings ?? DEFAULT_AGENCY_SETTINGS;
  const pageSize = Math.max(1, settings.topClientsCount || 10);
  const healthy = kind === "healthy";
  const [page, setPage] = useState(1);
  const periodYear = period?.year;
  const periodMonth = period?.month;

  const { rows, unscored } = useMemo(() => {
    const scoreOptions = {
      period: periodYear && periodMonth ? { year: periodYear, month: periodMonth } : null,
    };
    const scored = [];
    const missing = [];
    for (const c of buildCustomerEntities(clients)) {
      if (c.status !== "active") continue;
      const breakdown = clientHealthBreakdown(c, settings, scoreOptions);
      if (breakdown.total == null) {
        const available = breakdown.parts.filter((p) => p.score != null).map((p) => p.label);
        missing.push({ client: c, available });
      } else scored.push({ client: c, breakdown, score: breakdown.total });
    }
    const list = scored
      .filter((r) => (healthy ? r.score >= settings.healthyThreshold : r.score < settings.healthyThreshold))
      .sort(
        (a, b) =>
          (healthy ? b.score - a.score : a.score - b.score) || a.client.name.localeCompare(b.client.name, "da"),
      );
    return { rows: list, unscored: missing };
  }, [clients, healthy, settings, periodYear, periodMonth]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * pageSize;
  const visible = rows.slice(offset, offset + pageSize);

  return (
    <section className="tally-panel flex flex-col p-4 md:p-5" aria-labelledby={`pulse-rank-${kind}-heading`}>
      <div id={`pulse-rank-${kind}-heading`} className="flex flex-wrap items-start justify-between gap-2">
        <PulseCardHeader
          title={healthy ? "Sunde kunder" : "Usunde kunder"}
          sub={
            healthy ?
              `Score ${settings.healthyThreshold} eller højere, bedste først. Hold musen over scoren for udregningen.`
            : `Score under ${settings.healthyThreshold}, dårligste først. Hold musen over scoren for udregningen.`
          }
        />
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] tabular-nums text-fg-muted">
          {rows.length} kunder
        </span>
      </div>

      {rows.length === 0 ?
        <p className="mt-4 text-[12.5px] text-fg-muted">
          {healthy ? "Ingen aktive kunder over grænsen for sund." : "Ingen aktive kunder under grænsen for sund."}
        </p>
      : <div className="mt-3 overflow-x-auto">
          <div className="min-w-[420px]">
            <div
              className={cn(
                GRID,
                "border-b border-border-muted pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft",
              )}
            >
              <span />
              <span>Kunde</span>
              <span>NPS</span>
              <span>Indeks</span>
              <span>Tid brugt</span>
              <span className="text-right">Score</span>
            </div>
            {visible.map(({ client: c, breakdown, score }, i) => (
              <Link
                key={c.id}
                href={customerHref(c)}
                className={cn(
                  GRID,
                  "border-b border-border-muted py-2 text-[12.5px] last:border-0 hover:bg-surface-muted",
                )}
              >
                <span className="text-[11px] tabular-nums text-fg-quiet">{offset + i + 1}</span>
                <span className="truncate font-medium text-fg">{c.name}</span>
                <NpsValue value={c.latestNps} />
                <IndeksValue
                  value={c.indeks}
                  status={c.indeksStatus}
                  computedAt={c.indeksComputedAt}
                  partial={c.indeksPartial}
                />
                <span
                  className={cn(
                    "tabular-nums",
                    c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {formatHoursBudgetPairDa(c.hoursThisMonth, c.hoursBudget)}
                </span>
                <CrmHoverPopover
                  align="start"
                  title={`Sundhedsscore · ${c.name}`}
                  content={<HealthScoreExplanation breakdown={breakdown} />}
                  className="justify-end"
                >
                  <span
                    className={cn(
                      "text-right font-semibold tabular-nums underline decoration-dotted decoration-border underline-offset-2",
                      score >= settings.healthyThreshold && "text-agency-ok",
                      score >= settings.warnThreshold && score < settings.healthyThreshold && "text-agency-warn",
                      score < settings.warnThreshold && "text-agency-bad",
                    )}
                  >
                    {score}
                  </span>
                </CrmHoverPopover>
              </Link>
            ))}
          </div>
        </div>
      }

      {pageCount > 1 ?
        <nav
          className="mt-3 flex items-center justify-between gap-2 border-t border-border-muted pt-3 text-[12px]"
          aria-label={healthy ? "Sider for sunde kunder" : "Sider for usunde kunder"}
        >
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-full border border-border px-3 py-1 font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:pointer-events-none disabled:opacity-40"
          >
            Forrige
          </button>
          <span className="tabular-nums text-fg-quiet">
            Side {currentPage} af {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="rounded-full border border-border px-3 py-1 font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:pointer-events-none disabled:opacity-40"
          >
            Næste
          </button>
        </nav>
      : null}

      {!healthy && unscored.length > 0 ?
        <p className="mt-3 text-[11.5px] text-fg-quiet">
          <CrmHoverPopover
            align="start"
            title="Aktive kunder uden score"
            content={
              <ul className="space-y-0.5 text-[12px] text-fg-muted">
                {unscored.map(({ client: c, available }) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span>{c.name}</span>
                    <span className="shrink-0 text-fg-quiet">
                      {available.length ? `kun ${available.join(", ")}` : "ingen data"}
                    </span>
                  </li>
                ))}
              </ul>
            }
          >
            <span className="underline decoration-dotted decoration-border underline-offset-2">
              {unscored.length} aktive kunder
            </span>
          </CrmHoverPopover>{" "}
          har mindre end to af de tre datapunkter (Indeks, NPS, timebudget) og indgår ikke.
        </p>
      : null}
    </section>
  );
}
