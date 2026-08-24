"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrmDialog } from "@/components/crm/crm-dialog";
import { useDataSource } from "@/components/crm/use-data-source";
import { CalendarFiltersBar } from "@/components/calendar/calendar-filters-bar";
import { CalendarFullCalendar } from "@/components/calendar/calendar-full-calendar";
import { CalendarGoogleSync } from "@/components/calendar/calendar-google-sync";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { CalendarTasksSidebar } from "@/components/calendar/calendar-tasks-sidebar";
import {
  defaultTasksAssigneeSelection,
  taskMatchesAssigneeFilter,
} from "@/components/tasks/tasks-assignee-filter";
import { TaskDetailShell } from "@/components/tasks/task-detail-shell";
import { calendarColorsForTaskStatus } from "@/lib/crm/calendar-task-colors";
import {
  assigneesForEventProps,
  CALENDAR_CARD_TEXT_COLOR,
  resolveTaskAssignees,
  teamByIdFromTeam,
} from "@/lib/crm/calendar-task-assignees";
import { getCalendarDemoBundle } from "@/lib/crm/calendar-demo-bundle";
import { getTaskCalendarSlots } from "@/lib/crm/calendar-slots";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import {
  taskIsDone,
  taskIsOverdue,
  taskPriorityRank,
} from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/** @typedef {ReturnType<typeof getCalendarDemoBundle>} CalendarBundle */

/**
 * @param {Array<CalendarBundle['tasks'][number]>} tasks
 * @param {{
 *   q: string;
 *   scopeFilter: 'all' | 'open' | 'overdue';
 *   selectedAssignees: Set<string>;
 *   sort: string;
 *   taskDueReferenceIso: string;
 * }} filters
 */
function filterCalendarTasks(tasks, filters) {
  const list = tasks.filter((t) => {
    const ql = filters.q.trim().toLowerCase();
    if (
      ql &&
      !t.title.toLowerCase().includes(ql) &&
      !(t.hint?.toLowerCase().includes(ql)) &&
      !t.clientName.toLowerCase().includes(ql)
    ) {
      return false;
    }
    if (!taskMatchesAssigneeFilter(t, filters.selectedAssignees)) return false;
    if (filters.scopeFilter === "open" && taskIsDone(t.status)) return false;
    if (filters.scopeFilter === "overdue" && !taskIsOverdue(t, filters.taskDueReferenceIso)) return false;
    return true;
  });

  list.sort((a, b) => sortCalendarTasks(a, b, filters.sort));
  return list;
}

/**
 * Sidebar list: search + assignee only (includes done / all statuses).
 * @param {Array<CalendarBundle['tasks'][number]>} tasks
 * @param {{ q: string; selectedAssignees: Set<string>; sort: string }} filters
 */
function filterSidebarTasks(tasks, filters) {
  const list = tasks.filter((t) => {
    const ql = filters.q.trim().toLowerCase();
    if (
      ql &&
      !t.title.toLowerCase().includes(ql) &&
      !(t.hint?.toLowerCase().includes(ql)) &&
      !t.clientName.toLowerCase().includes(ql)
    ) {
      return false;
    }
    return taskMatchesAssigneeFilter(t, filters.selectedAssignees);
  });

  list.sort((a, b) => sortCalendarTasks(a, b, filters.sort));
  return list;
}

/**
 * @param {CalendarBundle['tasks'][number]} a
 * @param {CalendarBundle['tasks'][number]} b
 * @param {string} sort
 */
function sortCalendarTasks(a, b, sort) {
  if (sort === "due") {
    const ad = a.dueDate ? a.dueDate : "9999-12-31";
    const bd = b.dueDate ? b.dueDate : "9999-12-31";
    return ad.localeCompare(bd);
  }
  if (sort === "prio") {
    return (
      taskPriorityRank(/** @type {'high'|'medium'|'low'} */ (a.priority)) -
      taskPriorityRank(/** @type {'high'|'medium'|'low'} */ (b.priority))
    );
  }
  if (sort === "title") return a.title.localeCompare(b.title, "da");
  return 0;
}

/** @param {Date | string} value */
function calendarDayKey(value) {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarPortfolio() {
  const dataSource = useDataSource();
  const [bundle, setBundle] = useState(/** @type {CalendarBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [viewMode, setViewMode] = useState(/** @type {"week" | "month"} */ ("week"));
  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState(/** @type {"all" | "open" | "overdue"} */ ("all"));
  const [sort, setSort] = useState("due");
  const [selectedAssignees, setSelectedAssignees] = useState(/** @type {Set<string>} */ (new Set()));
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const [taskModal, setTaskModal] = useState(
    /** @type {{ taskId: string; parentTaskId?: string } | null} */ (null),
  );
  const [range, setRange] = useState(/** @type {{ start: string; end: string } | null} */ (null));
  const [highlightedSlotId, setHighlightedSlotId] = useState(/** @type {string | null} */ (null));
  const [scheduleError, setScheduleError] = useState(/** @type {string | null} */ (null));
  const [demoExtraSlots, setDemoExtraSlots] = useState(
    /** @type {Record<string, Array<{ id: string; start: string; end: string }>>} */ ({}),
  );
  const calendarRef = useRef(/** @type {{ focusSlot: (slotId: string, start: Date | string) => void } | null} */ (null));
  const rangeRef = useRef(/** @type {{ start: string; end: string } | null} */ (null));
  const assigneeFilterInitializedRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const handleRangeChange = useCallback((next) => {
    setRange((prev) => {
      if (prev?.start === next.start && prev?.end === next.end) return prev;
      rangeRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      if (dataSource === "demo") {
        const next = getCalendarDemoBundle();
        setBundle(next);
        if (!assigneeFilterInitializedRef.current) {
          setSelectedAssignees(
            defaultTasksAssigneeSelection(next.mineAssigneeKey ?? "", next.team),
          );
          assigneeFilterInitializedRef.current = true;
        }
        hasLoadedRef.current = true;
        return;
      }

      const qs = databaseApiQuery();
      const currentRange = rangeRef.current;
      if (currentRange?.start) qs.set("timeMin", currentRange.start);
      if (currentRange?.end) qs.set("timeMax", currentRange.end);
      qs.set("includeGoogle", showGoogleEvents ? "1" : "0");

      const res = await fetch(`/api/calendar?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kalender");

      setBundle(data);
      if (!assigneeFilterInitializedRef.current) {
        setSelectedAssignees(
          defaultTasksAssigneeSelection(data.mineAssigneeKey ?? "", data.team ?? []),
        );
        assigneeFilterInitializedRef.current = true;
      }
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource, showGoogleEvents]);

  useEffect(() => {
    hasLoadedRef.current = false;
    assigneeFilterInitializedRef.current = false;
    setDemoExtraSlots({});
    rangeRef.current = null;
    setRange(null);
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!range) return;
    queueMicrotask(() => {
      void load();
    });
  }, [load, range?.end, range?.start]);

  const mergeDemoSlots = useCallback(
    (tasks) => {
      if (dataSource !== "demo") return tasks;
      return tasks.map((t) => ({
        ...t,
        calendarSlots: demoExtraSlots[t.id] ?? getTaskCalendarSlots(t),
      }));
    },
    [dataSource, demoExtraSlots],
  );

  const filteredTasks = useMemo(() => {
    if (!bundle) return [];
    return mergeDemoSlots(
      filterCalendarTasks(bundle.tasks, {
        q,
        scopeFilter,
        selectedAssignees,
        sort,
        taskDueReferenceIso: bundle.taskDueReferenceIso,
      }),
    );
  }, [bundle, demoExtraSlots, mergeDemoSlots, q, scopeFilter, selectedAssignees, sort]);

  const sidebarTasks = useMemo(() => {
    if (!bundle) return [];
    return mergeDemoSlots(filterSidebarTasks(bundle.tasks, { q, selectedAssignees, sort }));
  }, [bundle, mergeDemoSlots, q, selectedAssignees, sort]);

  const teamById = useMemo(() => teamByIdFromTeam(bundle?.team ?? []), [bundle?.team]);

  const calendarEvents = useMemo(() => {
    /** @type {Array<Record<string, unknown>>} */
    const crm = [];
    /** @type {Array<Record<string, unknown>>} */
    const deadlines = [];

    for (const task of filteredTasks) {
      const colors = calendarColorsForTaskStatus(String(task.status ?? "todo"));
      const assignees = resolveTaskAssignees(task, teamById);
      const slots = getTaskCalendarSlots(task);
      const dueDate = typeof task.dueDate === "string" ? task.dueDate.trim() : "";
      const dueOverdue = Boolean(dueDate && taskIsOverdue(task, bundle?.taskDueReferenceIso ?? ""));
      const canMutate = dataSource === "database" || dataSource === "demo";
      const canEditSlot = canMutate;

      for (const slot of slots) {
        const slotIndex = typeof slot.index === "number" ? slot.index : 0;
        crm.push({
          id: `crm-${task.id}-${slotIndex}-${slot.id}`,
          title: task.title,
          start: slot.start,
          end: slot.end,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          editable: canEditSlot,
          startEditable: canEditSlot,
          durationEditable: canEditSlot,
          extendedProps: {
            source: "crm",
            taskId: task.id,
            slotId: slot.id,
            slotIndex,
            canEdit: canMutate,
            canDrag: canEditSlot,
            status: task.status,
            clientName: task.clientName,
            dueDate,
            dueOverdue,
            isSubTask: task.isSubTask === true,
            parentTaskId: typeof task.parentTaskId === "string" ? task.parentTaskId : "",
            colorBg: colors.bg,
            colorBorder: colors.border,
            colorText: colors.text,
            assignees: assigneesForEventProps(assignees),
          },
        });
      }

      if (dueDate && !taskIsDone(task.status)) {
        const dueKey = dueDate.slice(0, 10);
        const hasSlotOnDueDay = slots.some((s) => calendarDayKey(s.start) === dueKey);
        if (!hasSlotOnDueDay) {
          deadlines.push({
            id: `deadline-${task.id}`,
            title: `Deadline · ${task.title}`,
            start: dueKey,
            allDay: true,
            editable: false,
            backgroundColor: dueOverdue ? "#fde2e2" : "#fff3d6",
            borderColor: dueOverdue ? "#e07070" : "#e6b84d",
            textColor: CALENDAR_CARD_TEXT_COLOR,
            extendedProps: {
              source: "deadline",
              taskId: task.id,
              dueDate,
              dueOverdue,
              isSubTask: task.isSubTask === true,
              parentTaskId: typeof task.parentTaskId === "string" ? task.parentTaskId : "",
              colorBg: dueOverdue ? "#fde2e2" : "#fff3d6",
              colorBorder: dueOverdue ? "#e07070" : "#e6b84d",
            },
          });
        }
      }
    }

    const google =
      showGoogleEvents && bundle?.googleEvents?.length ?
        bundle.googleEvents.map((ev) => ({
          id: `google-${ev.id}`,
          title: ev.title,
          start: ev.start,
          end: ev.end,
          allDay: ev.allDay,
          editable: false,
          backgroundColor: "#ede9fe",
          borderColor: "#8b5cf6",
          textColor: "#5b21b6",
          extendedProps: {
            source: "google",
            htmlLink: ev.htmlLink ?? "",
            location: ev.location ?? "",
          },
        }))
      : [];

    return [...crm, ...deadlines, ...google];
  }, [bundle?.googleEvents, bundle?.taskDueReferenceIso, dataSource, filteredTasks, showGoogleEvents, teamById]);

  const scheduledSlots = useMemo(() => {
    /** @type {Array<{ task: CalendarBundle['tasks'][number]; slot: { id: string; start: string; end: string } }>} */
    const out = [];
    for (const task of sidebarTasks) {
      for (const slot of getTaskCalendarSlots(task)) {
        out.push({ task, slot });
      }
    }
    out.sort((a, b) => a.slot.start.localeCompare(b.slot.start));
    return out;
  }, [sidebarTasks]);

  const handleFocusSlot = useCallback((slotId, start) => {
    calendarRef.current?.focusSlot(slotId, start);
    setHighlightedSlotId(slotId);
    window.setTimeout(() => setHighlightedSlotId(null), 2800);
  }, []);

  const handleScheduleCreate = useCallback(
    async (taskId, start, end) => {
      if (dataSource === "demo") {
        const id = `demo-${Date.now()}`;
        setDemoExtraSlots((prev) => {
          const task = bundle?.tasks.find((t) => t.id === taskId);
          const current = prev[taskId] ?? (task ? getTaskCalendarSlots(task) : []);
          return { ...prev, [taskId]: [...current, { id, start, end }] };
        });
        return;
      }
      const qs = databaseApiQuery();
      const res = await fetch(`/api/calendar/schedule?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, start, end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette planlægning");
      await load();
    },
    [bundle?.tasks, dataSource, load],
  );

  const handleScheduleUpdate = useCallback(
    async (taskId, slotId, start, end, slotIndex) => {
      setScheduleError(null);
      if (dataSource === "demo") {
        setDemoExtraSlots((prev) => {
          const task = bundle?.tasks.find((t) => t.id === taskId);
          const current = prev[taskId] ?? (task ? getTaskCalendarSlots(task) : []);
          return {
            ...prev,
            [taskId]:
              Number.isInteger(slotIndex) ?
                current.map((slot, index) =>
                  index === slotIndex || slot.id === slotId ? { ...slot, start, end } : slot,
                )
              : current.map((slot) => (slot.id === slotId ? { ...slot, start, end } : slot)),
          };
        });
        return;
      }
      const qs = databaseApiQuery();
      const res = await fetch(`/api/calendar/schedule?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, slotId, slotIndex, start, end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke opdatere planlægning");
      await load();
    },
    [bundle?.tasks, dataSource, load],
  );

  const handleScheduleDelete = useCallback(
    async (taskId, slotId, slotIndex) => {
      setScheduleError(null);
      if (dataSource === "demo") {
        setDemoExtraSlots((prev) => {
          const task = bundle?.tasks.find((t) => t.id === taskId);
          const current = prev[taskId] ?? (task ? getTaskCalendarSlots(task) : []);
          return {
            ...prev,
            [taskId]:
              Number.isInteger(slotIndex) ?
                current.filter((slot, index) => index !== slotIndex && slot.id !== slotId)
              : current.filter((slot) => slot.id !== slotId),
          };
        });
        return;
      }
      const qs = databaseApiQuery();
      const res = await fetch(`/api/calendar/schedule?${qs}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, slotId, slotIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke fjerne planlægning");
      await load();
    },
    [bundle?.tasks, dataSource, load],
  );

  const handleScheduleDeleteSafe = useCallback(
    async (taskId, slotId, slotIndex) => {
      try {
        await handleScheduleDelete(taskId, slotId, slotIndex);
      } catch (e) {
        setScheduleError(e instanceof Error ? e.message : "Kunne ikke opdatere kalenderblok");
      }
    },
    [handleScheduleDelete],
  );

  const openCount = useMemo(
    () => (bundle ? bundle.tasks.filter((t) => !taskIsDone(t.status)).length : 0),
    [bundle],
  );
  const overdueCount = useMemo(
    () =>
      bundle ?
        bundle.tasks.filter((t) => taskIsOverdue(t, bundle.taskDueReferenceIso)).length
      : 0,
    [bundle],
  );

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="h-14 animate-pulse rounded-2xl bg-skeleton" />
        <div className="h-[560px] animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        {error ?? "Ingen data"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Arbejde</p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">
            Min kalender
          </h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] text-fg-muted">
            Planlæg opgaver i ugen eller måneden. Træk opgaver fra listen ind i kalenderen, og skeln mellem CRM-opgaver og Google Calendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dataSource === "database" ?
            <CalendarGoogleSync
              status={bundle.googleCalendar}
              showGoogleEvents={showGoogleEvents}
              onShowGoogleEventsChange={setShowGoogleEvents}
              onStatusChange={() => void load()}
            />
          : null}
        </div>
      </header>

      <CalendarFiltersBar
        taskCount={sidebarTasks.length}
        totalCount={bundle.tasks.length}
        q={q}
        onQChange={setQ}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        sort={sort}
        onSortChange={setSort}
        openCount={openCount}
        overdueCount={overdueCount}
        team={bundle.team}
        mineAssigneeKey={bundle.mineAssigneeKey ?? ""}
        selectedAssignees={selectedAssignees}
        onSelectedAssigneesChange={setSelectedAssignees}
        tasks={bundle.tasks}
      />

      {scheduleError ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {scheduleError}
        </p>
      : null}

      <div
        className={cn(
          "grid gap-[length:var(--ds-studio-stack)] xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start",
          refreshing && "opacity-70",
        )}
      >
        <section className="tally-panel overflow-hidden p-2 md:p-3">
          <CalendarFullCalendar
            ref={calendarRef}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            events={calendarEvents}
            editable={dataSource === "database" || dataSource === "demo"}
            highlightedSlotId={highlightedSlotId}
            onRangeChange={handleRangeChange}
            onTaskClick={(taskId, parentTaskId) => setTaskModal({ taskId, parentTaskId })}
            onGoogleClick={(htmlLink) => {
              if (htmlLink && typeof window !== "undefined") window.open(htmlLink, "_blank", "noopener,noreferrer");
            }}
            onScheduleCreate={handleScheduleCreate}
            onScheduleUpdate={handleScheduleUpdate}
            onScheduleDelete={handleScheduleDeleteSafe}
          />
        </section>

        <CalendarTasksSidebar
          dragTasks={sidebarTasks}
          scheduledSlots={scheduledSlots}
          taskDueReferenceIso={bundle.taskDueReferenceIso}
          teamById={teamById}
          draggable={dataSource === "database" || dataSource === "demo"}
          onFocusSlot={handleFocusSlot}
          onRemoveSlot={handleScheduleDeleteSafe}
        />
      </div>

      <CalendarLegend />

      <CrmDialog
        open={Boolean(taskModal)}
        onClose={() => setTaskModal(null)}
        ariaLabel="Opgavedetaljer"
        maxWidthClass="w-[min(100vw-1.5rem,90vw)]"
        className="max-h-[90vh]"
      >
        {taskModal ?
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
              <p className="font-sans text-[13px] font-medium text-fg-muted">Opgavedetaljer</p>
              <button
                type="button"
                onClick={() => setTaskModal(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-lg leading-none text-fg-muted hover:border-agency-brand-border hover:text-fg"
                aria-label="Luk"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
              <TaskDetailShell
                key={`${taskModal.taskId}-${taskModal.parentTaskId ?? ""}`}
                taskId={taskModal.taskId}
                parentTaskId={taskModal.parentTaskId ?? ""}
                embedded
                onClose={() => setTaskModal(null)}
                onTaskMutated={() => void load()}
              />
            </div>
          </div>
        : null}
      </CrmDialog>
    </div>
  );
}
