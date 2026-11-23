"use client";

import { parseQuickNumber, patchClient, QuickEditPopover, QUICK_EDIT_DEMO_HINT } from "@/components/clients/client-quick-edit";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { formatCurrencyCompact, formatPercent, formatHoursCompactDa } from "@/lib/crm/format-da";
import { taskIsDone } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * Budget (beløb/MRR), estimeret + brugt tid, og timebudget-udnyttelse.
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   tasks?: Array<{ status: string; estimateHours?: number | null }>;
 *   periodLabel?: string;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailDeliveryCard({ client, tasks = [], periodLabel, canEdit = false, onSaved }) {
  const hoursBudget = client.hoursBudget ?? 0;
  const retainer = client.retainer ?? 0;
  const currency = client.currency ?? "DKK";
  const spent = client.hoursThisMonth ?? 0;
  const estimated = tasks.reduce(
    (sum, t) =>
      !taskIsDone(t.status) && typeof t.estimateHours === "number" && Number.isFinite(t.estimateHours) ?
        sum + t.estimateHours
      : sum,
    0,
  );
  const util = hoursBudget > 0 ? spent / hoursBudget : 0;
  const utilTone = util > 1 ? "text-agency-bad" : util > 0.9 ? "text-agency-warn" : "text-agency-ok";

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Budget & tidsforbrug{periodLabel ? ` · ${periodLabel}` : ""}
      </h2>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">Budget</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg">
            {retainer > 0 ? formatCurrencyCompact(retainer, currency) : "—"}
          </dd>
          <dd className="text-[10.5px] text-fg-quiet">retainer / md</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">Estimeret</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg">
            {formatHoursCompactDa(estimated)} t
          </dd>
          <dd className="text-[10.5px] text-fg-quiet">på åbne opgaver</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">Brugt</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg">
            {formatHoursCompactDa(spent)} t
          </dd>
          <dd className="text-[10.5px] text-fg-quiet">registreret tid</dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-fg-muted">
            Timebudget brugt
            {hoursBudget > 0 ? ` (${formatHoursCompactDa(hoursBudget)} t)` : ""}
          </p>
          <p className={cn("text-[15px] font-semibold tabular-nums", hoursBudget > 0 ? utilTone : "text-fg-quiet")}>
            {hoursBudget > 0 ? formatPercent(util) : "Intet timebudget"}
          </p>
        </div>
        <PulseUtilBar hours={spent} budget={hoursBudget} className="mt-1.5" />
        {hoursBudget > 0 ?
          <p className="mt-1.5 text-[11px] tabular-nums text-fg-quiet">
            {spent <= hoursBudget ?
              `${formatHoursCompactDa(hoursBudget - spent)} t tilbage af timebudgettet`
            : `${formatHoursCompactDa(spent - hoursBudget)} t over timebudget`}
            {estimated > 0 ?
              ` · åbne estimater svarer til ${formatPercent(estimated / hoursBudget)} af timebudgettet`
            : ""}
          </p>
        : canEdit && !client.isGroup ?
          <div className="mt-2">
            <QuickEditPopover
              title="Timebudget pr. måned"
              canEdit={canEdit}
              disabledHint={QUICK_EDIT_DEMO_HINT}
              fields={[{ name: "hoursBudget", label: "Timer pr. måned", type: "number" }]}
              initialValues={{ hoursBudget: "" }}
              onSubmit={async (v) => {
                const n = parseQuickNumber(v.hoursBudget);
                if (Number.isNaN(n) || (n != null && n < 0)) throw new Error("Ugyldigt antal timer");
                await patchClient(client.id, { hoursBudget: n });
                onSaved?.();
              }}
            >
              <button type="button" className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
                Sæt timebudget…
              </button>
            </QuickEditPopover>
          </div>
        : null}
      </div>
    </div>
  );
}
