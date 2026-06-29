"use client";

import { ClientDetailAlertsCard } from "@/components/clients/client-detail-alerts-card";
import { TaskDetailActivityCard } from "@/components/tasks/task-detail-activity-card";
import { TaskDetailAssigneeCard } from "@/components/tasks/task-detail-assignee-card";
import { TaskDetailContextCard } from "@/components/tasks/task-detail-context-card";
import { TaskDetailDescriptionCard } from "@/components/tasks/task-detail-description-card";
import { TaskDetailKpiStrip } from "@/components/tasks/task-detail-kpi-strip";
import { TaskDetailMongoPanel } from "@/components/tasks/task-detail-mongo-panel";
import { TaskDetailTimeTodayCard } from "@/components/tasks/task-detail-time-today-card";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";

export const TASK_DETAIL_TAB_IDS = /** @type {const} */ (["overblik", "tid", "relationer", "crm", "spor"]);

const TAB_DEFS = [
  { id: "overblik", label: "Overblik" },
  { id: "tid", label: "Tidslog" },
  { id: "relationer", label: "Relationer" },
  { id: "crm", label: "CRM" },
  { id: "spor", label: "Aktivitet" },
];

/**
 * @param {{
 *   tab: string;
 *   onTabChange: (id: string) => void;
 *   taskRow: Record<string, unknown>;
 *   clientRow: Record<string, unknown>;
 *   assigneePulse: Record<string, unknown> | null;
 *   departments: Array<Record<string, unknown>>;
 *   alerts: unknown[];
 *   activityFootnote?: string;
 *   demoActivity?: Array<{ id: string; at: string; actorId: string; kind: string; body: string }>;
 *   dbActivity?: Array<{ id: string; at: string; kind: string; summary: string }>;
 *   contractWire: Record<string, unknown> | null;
 *   dueReferenceIso: string;
 *   periodLabel?: string;
 *   timeEntries: Array<{ id: string; at: string; dur: number; desc: string; dept?: string | null }>;
 *   mongo?: {
 *     taskId: string;
 *     wire: Record<string, unknown>;
 *     departments: Array<{ id: string; name?: string }>;
 *     team: Array<{ id: string; name: string }>;
 *     clientsPicklist: Array<{ value: string; label: string }>;
 *     busy?: boolean;
 *     notice?: string | null;
 *     onBusyChange?: (b: boolean) => void;
 *     onNotice?: (s: string | null) => void;
 *     onReload: () => void | Promise<void>;
 *   };
 * }} props
 */
export function TaskDetailTabbedBody({
  tab,
  onTabChange,
  taskRow,
  clientRow,
  assigneePulse,
  departments,
  alerts,
  activityFootnote,
  demoActivity = [],
  dbActivity = [],
  contractWire,
  dueReferenceIso,
  periodLabel = "",
  timeEntries,
  mongo = null,
}) {
  /** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    TASK_DETAIL_TAB_IDS.includes(/** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (tab)) ?
      /** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (tab)
    : "overblik";

  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";

  /** @type {Array<{ id: string; at: string; actorId?: string; kind: string; body?: string; summary?: string }>} */
  const mergedDb = dbActivity.map((e) => ({
    id: e.id,
    at: e.at,
    kind: e.kind,
    summary: e.summary,
    body: e.summary,
  }));

  const activityEntries =
    mongo ? mergedDb : /** @type {typeof demoActivity} */ (demoActivity ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Sektion</p>
        <nav aria-label="Opgave-undersektioner">
          <PulseSegmentedControl size="sm" active={resolvedTab} onChange={onTabChange} tabs={TAB_DEFS} />
        </nav>
      </div>

      <div role="tabpanel" className="min-w-0">
        {resolvedTab === "overblik" ?
          <section aria-labelledby="task-tab-overview" className={stack}>
            <h2 id="task-tab-overview" className="sr-only">
              Overblik
            </h2>
            <TaskDetailDescriptionCard
              task={
                /** @type {{ hint?: string; dept: string; title: string; status: string }} */ (
                  taskRow
                )
              }
              mode={mongo ? "database" : "demo"}
            />
            <TaskDetailKpiStrip
              task={
                /** @type {{ dept: string; dueDate: string; status: string }} */ (taskRow)
              }
              assigneeName={assigneePulse && typeof assigneePulse.name === "string" ? assigneePulse.name : null}
              departments={mongo ? departments : undefined}
              dueReferenceIso={dueReferenceIso}
            />
          </section>
        : null}

        {resolvedTab === "tid" ?
          <section className={stack}>
            <TaskDetailTimeTodayCard
              taskId={typeof taskRow.id === "string" ? taskRow.id : ""}
              entries={timeEntries}
              departments={departments}
              periodLabel={periodLabel}
              sourceHint={mongo ? "Billable registreringer på kunden i valgt måned, filtreret til denne opgave." : undefined}
            />
          </section>
        : null}

        {resolvedTab === "relationer" ?
          <section className={stack}>
            <TaskDetailContextCard
              client={
                /** @type {{ id: string; name: string; industry?: string }} */ (
                  /** @type {unknown} */ (clientRow)
                )
              }
              contract={
                contractWire ?
                  /** @type {{ id: string; clientId: string; clientName: string; clientLogo: string; clientHue: number; kind: string; monthlyValue: number; currency: string }} */ (
                    /** @type {unknown} */ (contractWire)
                  )
                : null
              }
            />
            <TaskDetailAssigneeCard
              member={
                assigneePulse && typeof assigneePulse === "object" ?
                  /** @type {{ id: string; name: string; role: string; avatar: string; hue: number; dept: string }} */ (
                    /** @type {unknown} */ (assigneePulse)
                  )
                : null
              }
              departmentsLookup={mongo ? departments : undefined}
            />
            <ClientDetailAlertsCard
              clientId={typeof clientRow.id === "string" ? clientRow.id : ""}
              alerts={
                /** @type {{ id: string; severity: string; title: string; body: string; age: string; client?: string | null }[]} */ (
                  alerts ?? []
                )
              }
              description={
                mongo ? "Udtræk af budget-/sundhedsalarmer på kunden i månedligt Pulse-udsnit." : undefined
              }
            />
          </section>
        : null}

        {resolvedTab === "crm" && mongo ?
          <section className={stack}>
            <TaskDetailMongoPanel
              taskId={mongo.taskId}
              wire={mongo.wire}
              departments={mongo.departments}
              team={mongo.team}
              clientsPicklist={mongo.clientsPicklist}
              busy={mongo.busy}
              notice={mongo.notice}
              onBusyChange={mongo.onBusyChange}
              onNotice={mongo.onNotice}
              onReload={mongo.onReload}
            />
          </section>
        : null}

        {resolvedTab === "crm" && !mongo ?
          <section className={stack}>
            <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 p-8 text-[13px] text-fg-muted">
              CRM-redigering er ikke tilgængelig i denne visning.
            </div>
          </section>
        : null}

        {resolvedTab === "spor" ?
          <TaskDetailActivityCard entries={activityEntries} footnote={activityFootnote} />
        : null}
      </div>
    </div>
  );
}
