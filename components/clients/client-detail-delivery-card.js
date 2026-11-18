"use client";

import { parseQuickNumber, patchClient, QuickEditPopover, QUICK_EDIT_DEMO_HINT } from "@/components/clients/client-quick-edit";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { formatPercent, formatHoursCompactDa } from "@/lib/crm/format-da";
import { taskIsDone } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * Budget (timebudget), estimeret (åbne opgaver), faktisk brugt i perioden og % af budget.
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   tasks?: Array<{ status: string; estimateHours?: number | null }>;
 *   periodLabel?: string;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailDeliveryCard({ client, tasks = [], periodLabel, canEdit = false, onSaved }) {
  const budget = client.hoursBudget ?? 0;
  const spent = client.hoursThisMonth ?? 0;
  const estimated = tasks.reduce(
    (sum, t) =>
      !taskIsDone(t.status) && typeof t.estimateHours === "number" && Number.isFinite(t.estimateHours) ?
        sum + t.estimateHours
      : sum,
    0,
  );
  const util = budget > 0 ? spent / budget : 0;
  const utilTone = util > 1 ? "text-agency-bad" : util > 0.9 ? "text-agency-warn" : "text-agency-ok";

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Budget & tidsforbrug{periodLabel ? ` · ${periodLabel}` : ""}
      </h2>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">Budget</dt>
          <dd className="mt-1">
            <QuickEditPopover
              title="Timebudget pr. måned"
              canEdit={canEdit}
              disabledHint={client.isGroup ? "Redigeres pr. brand" : QUICK_EDIT_DEMO_HINT}
              fields={[{ name: "hoursBudget", label: "Timer pr. måned", type: "number" }]}
              initialValues={{ hoursBudget: budget ? String(budget) : "" }}
              onSubmit={async (v) => {
                const n = parseQuickNumber(v.hoursBudget);
                if (Number.isNaN(n) || (n != null && n < 0)) throw new Error("Ugyldigt antal timer");
                await patchClient(client.id, { hoursBudget: n });
                onSaved?.();
              }}
            >
              <span className="text-xl font-semibold tabular-nums tracking-tight text-fg">
                {budget > 0 ? `${formatHoursCompactDa(budget)} t` : "—"}
              </span>
            </QuickEditPopover>
          </dd>
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
          <p className="text-[11px] text-fg-muted">Budget brugt</p>
          <p className={cn("text-[15px] font-semibold tabular-nums", budget > 0 ? utilTone : "text-fg-quiet")}>
            {budget > 0 ? formatPercent(util) : "Intet budget"}
          </p>
        </div>
        <PulseUtilBar hours={spent} budget={budget} className="mt-1.5" />
        {budget > 0 ?
          <p className="mt-1.5 text-[11px] tabular-nums text-fg-quiet">
            {spent <= budget ?
              `${formatHoursCompactDa(budget - spent)} t tilbage af budgettet`
            : `${formatHoursCompactDa(spent - budget)} t over budget`}
            {estimated > 0 ? ` · åbne estimater svarer til ${formatPercent(estimated / budget)} af budgettet` : ""}
          </p>
        : null}
      </div>
    </div>
  );
}
