"use client";

import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { formatHoursBudgetPairDa, formatHoursCompactDa, formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{ label: string; value: string; detail: string; warn?: boolean }} row
 */
function ExplainRow({ label, value, detail, warn = false }) {
  return (
    <div className="rounded-lg bg-surface-muted px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-fg-soft">
          {label}
        </span>
        <span
          className={
            warn ?
              "text-[11.5px] font-semibold tabular-nums text-agency-warn"
            : "text-[11.5px] font-semibold tabular-nums text-fg"
          }
        >
          {value}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-fg-muted">{detail}</p>
    </div>
  );
}

/**
 * @param {{
 *   periodLabel: string;
 *   hoursThisMonth: number;
 *   hoursBudget: number;
 *   estimatedHoursOpen?: number;
 *   clientName?: string;
 *   clientHref?: string;
 * }} opts
 */
function clientHoursExplain(opts) {
  const {
    periodLabel,
    hoursThisMonth,
    hoursBudget,
    estimatedHoursOpen = 0,
    clientName,
    clientHref,
  } = opts;
  const util = hoursBudget > 0 ? hoursThisMonth / hoursBudget : null;
  const budgetUnset = hoursBudget <= 0;

  return (
    <div className="space-y-2">
      <ExplainRow
        label="Faktiske timer"
        value={`${formatHoursCompactDa(hoursThisMonth)} t`}
        detail={`Sum af tidsregistreringer${clientName ? ` for ${clientName}` : ""} med workedAt i ${periodLabel}. Kommer fra modulet Tid — ikke fra opgaver.`}
      />
      <ExplainRow
        label="Timebudget"
        value={budgetUnset ? "Ikke sat" : `${formatHoursCompactDa(hoursBudget)} t/md`}
        detail={
          budgetUnset ?
            "Aftalt månedligt timebudget på kundekortet (Leverance & NPS → Timebudget). Uden dette vises udnyttelse ikke."
          : "Aftalt månedligt timebudget fra kundekortet. Bruges som nævner i timer/budget."
        }
        warn={budgetUnset}
      />
      {estimatedHoursOpen > 0 ?
        <ExplainRow
          label="Estimerede timer"
          value={`+${formatHoursCompactDa(estimatedHoursOpen)} t`}
          detail="Sum af estimerede timer på åbne opgaver (ikke Færdig/Afbrudt). Vises kun som supplement — tæller ikke med i faktisk forbrug eller udnyttelse."
        />
      : null}
      <p className="border-t border-border-muted pt-2 text-[11px] leading-snug text-fg-muted">
        {util != null ?
          <>Udnyttelse: {formatPercent(util)} (= faktiske timer ÷ timebudget).</>
        : <>Udnyttelse kan ikke beregnes uden timebudget på kunden.</>}
        {budgetUnset && clientHref ?
          <>
            {" "}
            <a href={clientHref} className="text-agency-brand underline-offset-2 hover:underline">
              Rediger kunde
            </a>
          </>
        : null}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   periodLabel: string;
 *   deptName: string;
 *   hours: number;
 *   budget: number;
 *   revenue: number;
 *   util: number;
 *   estimatedHoursOpen?: number;
 *   budgetFromClients?: boolean;
 * }} opts
 */
function deptHoursExplain(opts) {
  const {
    periodLabel,
    deptName,
    hours,
    budget,
    revenue,
    util,
    estimatedHoursOpen = 0,
    budgetFromClients = false,
  } = opts;

  return (
    <div className="space-y-2">
      <ExplainRow
        label="Faktiske timer"
        value={`${formatHoursCompactDa(hours)} t`}
        detail={`Sum af tidsregistreringer i ${periodLabel} for ${deptName}. Bruger afdeling på registreringen — eller arver fra tilknyttet opgave hvis afdeling mangler.`}
      />
      <ExplainRow
        label="Budget"
        value={`${formatHoursCompactDa(budget)} t`}
        detail={
          budgetFromClients ?
            `Sum af (kunders timebudget × allokerings-%) for aktive kunder på ${deptName}.`
          : `Ingen kunder har timebudget × allokering til ${deptName} — derfor bruges afdelingens kapacitet som budget.`
        }
      />
      <ExplainRow
        label="Retainer (bar)"
        value={`${Math.round(revenue).toLocaleString("da-DK")} kr`}
        detail={`Allokeret retainer-værdi: sum(retainer × allokerings-%) for aktive kunder på ${deptName}. Den mørke bar viser leveret tid i forhold til revenue-bredden.`}
      />
      {estimatedHoursOpen > 0 ?
        <ExplainRow
          label="Estimerede timer"
          value={`+${formatHoursCompactDa(estimatedHoursOpen)} t`}
          detail="Sum af estimerede timer på åbne opgaver i afdelingen. Pipeline-indikator — ikke logget tid."
        />
      : null}
      <p className="border-t border-border-muted pt-2 text-[11px] leading-snug text-fg-muted">
        Udnyttelse: {formatPercent(util)} (= faktiske timer ÷ budget). Opgave-estimater påvirker ikke denne procent.
      </p>
    </div>
  );
}

/**
 * @param {{
 *   hoursThisMonth: number;
 *   hoursBudget: number;
 *   estimatedHoursOpen?: number;
 *   periodLabel: string;
 *   clientName?: string;
 *   clientHref?: string;
 *   utilClassName?: string;
 *   showUtilBar?: boolean;
 *   utilBarClassName?: string;
 *   align?: 'start' | 'center';
 * }} props
 */
export function PulseClientHoursMetric({
  hoursThisMonth,
  hoursBudget,
  estimatedHoursOpen,
  periodLabel,
  clientName,
  clientHref,
  utilClassName,
  showUtilBar = true,
  utilBarClassName,
  align = "start",
}) {
  const util = hoursBudget > 0 ? hoursThisMonth / hoursBudget : 0;

  return (
    <CrmHoverPopover
      align={align}
      title="Sådan beregnes timer denne md."
      content={clientHoursExplain({
        periodLabel,
        hoursThisMonth,
        hoursBudget,
        estimatedHoursOpen,
        clientName,
        clientHref,
      })}
      className="min-w-0 flex-col gap-0.5"
      triggerClassName="flex min-w-0 flex-col gap-0.5"
    >
      <span
        className={cn(
          "text-[12px] tabular-nums underline decoration-dotted decoration-border underline-offset-2",
          util > 1 ? "text-agency-bad" : "text-fg",
          utilClassName,
        )}
      >
        {formatHoursBudgetPairDa(hoursThisMonth, hoursBudget)}
      </span>
      {typeof estimatedHoursOpen === "number" && estimatedHoursOpen > 0 ?
        <span className="text-[10px] tabular-nums text-fg-quiet">
          +{formatHoursCompactDa(estimatedHoursOpen)}t est. (åbne opgaver)
        </span>
      : null}
      {showUtilBar ?
        <PulseUtilBar hours={hoursThisMonth} budget={hoursBudget} className={utilBarClassName} />
      : null}
    </CrmHoverPopover>
  );
}

/**
 * @param {{
 *   hours: number;
 *   budget: number;
 *   revenue: number;
 *   util: number;
 *   estimatedHoursOpen?: number;
 *   periodLabel: string;
 *   deptName: string;
 *   budgetFromClients?: boolean;
 *   className?: string;
 *   align?: 'start' | 'center';
 * }} props
 */
export function PulseDeptHoursMetric({
  hours,
  budget,
  revenue,
  util,
  estimatedHoursOpen,
  periodLabel,
  deptName,
  budgetFromClients,
  className,
  align = "center",
}) {
  return (
    <CrmHoverPopover
      align={align}
      title={`Sådan beregnes ${deptName}`}
      content={deptHoursExplain({
        periodLabel,
        deptName,
        hours,
        budget,
        revenue,
        util,
        estimatedHoursOpen,
        budgetFromClients,
      })}
      className={cn("text-right", className)}
      triggerClassName="inline-flex flex-col items-end gap-0.5"
    >
      <span className="text-[12px] tabular-nums text-fg-muted underline decoration-dotted decoration-border underline-offset-2 sm:text-right">
        {formatHoursBudgetPairDa(hours, budget)}
      </span>
      {typeof estimatedHoursOpen === "number" && estimatedHoursOpen > 0 ?
        <span className="mt-0.5 block text-[10px] text-fg-quiet">
          +{formatHoursCompactDa(estimatedHoursOpen)}t est.
        </span>
      : null}
    </CrmHoverPopover>
  );
}
