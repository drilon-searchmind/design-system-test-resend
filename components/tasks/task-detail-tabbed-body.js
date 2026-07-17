"use client";

import { TaskDetailActivityCard } from "@/components/tasks/task-detail-activity-card";
import { TaskDetailAssigneeCard } from "@/components/tasks/task-detail-assignee-card";
import { TaskDetailCommentsSection } from "@/components/tasks/task-detail-comments-section";
import { TaskDetailContextCard } from "@/components/tasks/task-detail-context-card";
import { TaskDetailDescriptionCard } from "@/components/tasks/task-detail-description-card";
import { TaskDetailKpiStrip } from "@/components/tasks/task-detail-kpi-strip";
import { TaskDetailTimeTodayCard } from "@/components/tasks/task-detail-time-today-card";
import { TaskSubtasksSection } from "@/components/tasks/task-subtasks-section";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

export const TASK_DETAIL_TAB_IDS = /** @type {const} */ (["overblik", "aktivitet"]);

const TAB_DEFS = [
  { id: "overblik", label: "Overblik" },
  { id: "aktivitet", label: "Aktivitet" },
];

/** @param {string} tab */
export function normalizeTaskDetailTab(tab) {
  if (tab === "aktivitet" || tab === "spor") return "aktivitet";
  return "overblik";
}

/**
 * @param {{
 *   tab: string;
 *   onTabChange: (id: string) => void;
 *   taskRow: Record<string, unknown>;
 *   clientRow: Record<string, unknown>;
 *   assigneePulse: Record<string, unknown> | null;
 *   departments: Array<Record<string, unknown>>;
 *   activityFootnote?: string;
 *   demoActivity?: Array<{ id: string; at: string; actorId: string; kind: string; body: string }>;
 *   dbActivity?: Array<{ id: string; at: string; kind: string; summary: string }>;
 *   contractWire: Record<string, unknown> | null;
 *   dueReferenceIso: string;
 *   periodLabel?: string;
 *   timeEntries: Array<{
 *     id: string;
 *     at: string;
 *     dur: number;
 *     desc: string;
 *     dept?: string | null;
 *     memberKey?: string;
 *     memberName?: string;
 *   }>;
 *   mode?: "demo" | "database";
 *   team?: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   highlightCommentId?: string;
 *   subTasks?: Array<Record<string, unknown>>;
 *   subTaskCreateContext?: {
 *     parentTaskId: string;
 *     parentTaskTitle: string;
 *     departments: Array<{ id: string; name: string }>;
 *     team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *     clientsPicklist: Array<{ value: string; label: string }>;
 *     taskTemplatesForCreate?: Array<Record<string, unknown>>;
 *     onSubTaskCreated?: () => void;
 *     readOnly?: boolean;
 *   } | null;
 * }} props
 */
export function TaskDetailTabbedBody({
  tab,
  onTabChange,
  taskRow,
  clientRow,
  assigneePulse,
  departments,
  activityFootnote,
  demoActivity = [],
  dbActivity = [],
  contractWire,
  dueReferenceIso,
  periodLabel = "",
  timeEntries,
  mode = "demo",
  team = [],
  highlightCommentId = "",
  subTasks = [],
  subTaskCreateContext = null,
}) {
  const resolvedTab = normalizeTaskDetailTab(tab);

  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";

  /** @type {Array<{ id: string; at: string; actorId?: string; kind: string; body?: string; summary?: string }>} */
  const mergedDb = dbActivity.map((e) => ({
    id: e.id,
    at: e.at,
    kind: e.kind,
    summary: e.summary,
    body: e.summary,
  }));

  const activityEntries = mode === "database" ? mergedDb : /** @type {typeof demoActivity} */ (demoActivity ?? []);

  const assigneeForKpi =
    assigneePulse && typeof assigneePulse.name === "string" ?
      {
        name: assigneePulse.name,
        avatar: typeof assigneePulse.avatar === "string" ? assigneePulse.avatar : undefined,
        hue: typeof assigneePulse.hue === "number" ? assigneePulse.hue : undefined,
        image: typeof assigneePulse.image === "string" ? assigneePulse.image : undefined,
      }
    : null;

  const loggedMinutes = timeEntries.reduce((s, e) => s + (Number(e.dur) || 0), 0);

  return (
    <div className="grid gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,38%)] lg:gap-x-10 lg:items-start">
      <div className="order-1 border-b border-border/60 pb-4 lg:col-start-1 lg:row-start-1">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Sektion</p>
          <nav aria-label="Opgave-undersektioner">
            <PulseSegmentedControl
              size="sm"
              active={resolvedTab}
              onChange={(id) => onTabChange(id)}
              tabs={TAB_DEFS}
            />
          </nav>
        </div>
      </div>

      <div className="order-2 flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
        <div role="tabpanel" className="min-w-0">
          {resolvedTab === "overblik" ?
            <section aria-labelledby="task-tab-overview" className={cn(stack, "min-w-0")}>
              <h2 id="task-tab-overview" className="sr-only">
                Overblik
              </h2>
              <TaskDetailKpiStrip
                task={
                  /** @type {{ dept: string; dueDate: string; status: string; estimateHours?: number | null }} */ (
                    taskRow
                  )
                }
                assigneeName={assigneePulse && typeof assigneePulse.name === "string" ? assigneePulse.name : null}
                assignee={assigneeForKpi}
                departments={mode === "database" ? departments : undefined}
                dueReferenceIso={dueReferenceIso}
                loggedMinutes={loggedMinutes}
              />
              <TaskDetailDescriptionCard
                task={
                  /** @type {{ hint?: string; description?: string; dept: string; title: string; status: string }} */ (
                    taskRow
                  )
                }
                mode={mode}
              />
              {subTaskCreateContext ?
                <TaskSubtasksSection
                  parentTaskId={subTaskCreateContext.parentTaskId}
                  parentTaskTitle={subTaskCreateContext.parentTaskTitle}
                  subTasks={
                    /** @type {Array<{ id: string; title: string; hint?: string; status: string; priority: 'high' | 'medium' | 'low'; dueDate?: string; isSubTask?: boolean; parentTaskId?: string }>} */ (
                      subTasks
                    )
                  }
                  departments={subTaskCreateContext.departments}
                  team={subTaskCreateContext.team}
                  clientsPicklist={subTaskCreateContext.clientsPicklist}
                  taskTemplatesForCreate={subTaskCreateContext.taskTemplatesForCreate ?? []}
                  onCreated={subTaskCreateContext.onSubTaskCreated}
                  readOnly={subTaskCreateContext.readOnly === true}
                />
              : null}
              <TaskDetailTimeTodayCard
                taskId={typeof taskRow.id === "string" ? taskRow.id : ""}
                entries={timeEntries}
                departments={departments}
                periodLabel={periodLabel}
                sourceHint="Alle registrerede timer på opgaven — med hvem der har logget."
              />
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
                departmentsLookup={mode === "database" ? departments : undefined}
              />
            </section>
          : null}

          {resolvedTab === "aktivitet" ?
            <TaskDetailActivityCard entries={activityEntries} footnote={activityFootnote} />
          : null}
        </div>
      </div>

      <aside className="order-3 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-4 lg:self-start">
        <TaskDetailCommentsSection
          taskId={typeof taskRow.id === "string" ? taskRow.id : ""}
          mode={mode}
          team={team}
          highlightCommentId={highlightCommentId}
          layout="sidebar"
          showHeading
        />
      </aside>
    </div>
  );
}
