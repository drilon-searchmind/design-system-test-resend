"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TaskDetailCreatedBy } from "@/components/tasks/task-detail-created-by";
import { TaskDetailHeader } from "@/components/tasks/task-detail-header";
import { TaskDetailOverview } from "@/components/tasks/task-detail-overview";
import { TaskDetailStatusBar } from "@/components/tasks/task-detail-status-bar";
import { TaskDetailTimerMenu } from "@/components/tasks/task-detail-timer-menu";
import { useTaskFieldSave } from "@/components/tasks/use-task-field-save";
import { useDataSource } from "@/components/crm/use-data-source";
import { routes, taskHref } from "@/config/routes";
import {
  CLIENTS,
  DEPARTMENTS,
  TASK_ACTIVITY_LOG,
  TASKS,
  TEAM,
  TIME_ENTRIES_TODAY,
} from "@/lib/crm/static-data";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { taskStatusPatch } from "@/lib/crm/task-edit-utils";
import {
  sanitizeTaskUiStatus,
  taskDueReferenceTodayIso,
  taskIsDone,
} from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

const DEMO_READ_ONLY_HINT = "Demo-tilstand — felterne kan kun redigeres i database-tilstand.";

/** @type {Record<string, import('@/components/tasks/use-task-field-save').TaskFieldStatus>} */
const NO_FIELD_STATUS = {};

const noopFieldSave = async () => false;

/**
 * @param {Record<string, unknown>} row
 * @param {string} fallbackId
 */
function toFieldTask(row, fallbackId) {
  const assigneeIds =
    Array.isArray(row.assigneeIds) ? row.assigneeIds.map((k) => String(k).trim()).filter(Boolean)
    : typeof row.assigneeId === "string" && row.assigneeId.trim() ? [row.assigneeId.trim()]
    : [];
  return {
    id: typeof row.id === "string" ? row.id : fallbackId,
    title: typeof row.title === "string" ? row.title : "—",
    status: sanitizeTaskUiStatus(String(row.status ?? "todo")),
    dueDate: typeof row.dueDate === "string" ? row.dueDate.trim().slice(0, 10) : "",
    priority:
      row.priority === "high" || row.priority === "low" ? row.priority : /** @type {'medium'} */ ("medium"),
    dept: typeof row.dept === "string" ? row.dept : "",
    clientId: typeof row.clientId === "string" ? row.clientId.trim() : "",
    clientName: typeof row.clientName === "string" ? row.clientName : "",
    clientLogo: typeof row.clientLogo === "string" ? row.clientLogo : "?",
    clientHue: typeof row.clientHue === "number" ? row.clientHue : 220,
    billable: row.billable !== false,
    estimateHours:
      typeof row.estimateHours === "number" && Number.isFinite(row.estimateHours) ? row.estimateHours : null,
    assigneeIds,
    isSubTask: row.isSubTask === true,
    parentTaskId: typeof row.parentTaskId === "string" ? row.parentTaskId.trim() : "",
    parentTaskTitle: typeof row.parentTaskTitle === "string" ? row.parentTaskTitle : "",
    description: typeof row.description === "string" ? row.description : "",
  };
}

/**
 * @param {{ taskId: string; parentTaskId?: string; highlightCommentId?: string; embedded?: boolean; onClose?: () => void; onTaskMutated?: () => void }} props
 */
export function TaskDetailShell({
  taskId,
  parentTaskId = "",
  highlightCommentId = "",
  embedded = false,
  onClose,
  onTaskMutated,
}) {
  const router = useRouter();
  const dataSource = useDataSource();
  const [remote, setRemote] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState(/** @type {string | null} */ (null));

  const loadRemote = useCallback(
    async (/** @type {{ silent?: boolean } | undefined} */ opts) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const qs = databaseApiQuery();
        const parentQs =
          parentTaskId.trim() ? `&parentTaskId=${encodeURIComponent(parentTaskId.trim())}` : "";
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}${parentQs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente opgaven");
        setRemote(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fejl");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [parentTaskId, taskId],
  );

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  /** @type {Record<string, unknown> | undefined} */
  const rTask =
    remote && typeof remote.task === "object" && remote.task !== null ?
      /** @type {Record<string, unknown>} */ (remote.task)
    : undefined;

  const { saveField, fieldStatus, saveError } = useTaskFieldSave({
    taskId,
    task: rTask,
    setRemote,
    onSettled: () => {
      void loadRemote({ silent: true });
      router.refresh();
      onTaskMutated?.();
    },
  });

  const deleteTask = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slette denne opgave permanent? Handlingen kan ikke fortrydes.")
    ) {
      return;
    }
    setDeleting(true);
    setDeleteNotice(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      const parentAfterDelete =
        rTask?.isSubTask === true && typeof rTask.parentTaskId === "string" ? rTask.parentTaskId.trim() : "";
      if (embedded) {
        onClose?.();
        onTaskMutated?.();
      } else {
        router.push(parentAfterDelete ? taskHref(parentAfterDelete) : routes.tasks);
      }
    } catch (e) {
      setDeleteNotice(e instanceof Error ? e.message : "Fejl ved sletning");
    } finally {
      setDeleting(false);
    }
  }, [embedded, onClose, onTaskMutated, rTask, router, taskId]);

  const demoTask = dataSource === "demo" ? TASKS.find((t) => t.id === taskId) : undefined;

  if (dataSource === "demo" && demoTask && parentTaskId.trim()) {
    if (demoTask.isSubTask !== true || String(demoTask.parentTaskId ?? "") !== parentTaskId.trim()) {
      return (
        <div className="space-y-4">
          <p className="font-sans text-[13px] text-fg-muted">
            Delopgaven hører ikke til den angivne hovedopgave.{" "}
            <Link href={routes.tasks} className="text-agency-brand hover:underline">
              Tilbage til Opgaver
            </Link>
          </p>
        </div>
      );
    }
  }

  if (dataSource === "demo" && !demoTask) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen opgave med id <span className="text-fg">{taskId}</span>.{" "}
          <Link href={routes.tasks} className="text-agency-brand hover:underline">
            Tilbage til Opgaver
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "demo" && demoTask) {
    const client = CLIENTS.find((c) => c.id === demoTask.clientId);
    if (!client) {
      return (
        <p className="font-sans text-[13px] text-fg-muted">
          Mangler tilknyttet kunde. <Link href={routes.tasks}>Tilbage</Link>
        </p>
      );
    }

    const task = toFieldTask(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (demoTask)), taskId);
    const creator = TEAM.find((m) => m.id === demoTask.assigneeId) ?? null;
    const dep = DEPARTMENTS.find((d) => d.id === demoTask.dept);
    const parentDemo = task.isSubTask && task.parentTaskId ? TASKS.find((t) => t.id === task.parentTaskId) ?? null : null;
    const subtitle =
      taskIsDone(task.status) ? "Afsluttet på board."
      : task.status === "blocked" ? "Blokket — afvent dokumenteret clearance."
      : "";

    /** @type {Record<string, unknown>[]} */
    const departmentRowsDemo = DEPARTMENTS.map((d) =>
      /** @type {Record<string, unknown>} */ ({
        ...d,
        short: typeof d.short === "string" ? d.short : d.id,
      }),
    );
    const teamDemo = TEAM.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      hue: m.hue,
      image: typeof m.image === "string" ? m.image : undefined,
    }));
    const demoSubTasks = TASKS.filter(
      (t) => t.isSubTask === true && String(t.parentTaskId ?? "") === demoTask.id,
    );

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TaskDetailHeader
          trailing={
            <TaskDetailTimerMenu clientSlug={task.clientId} taskKey={task.id} taskTitle={task.title} billable={task.billable} disabled />
          }
          task={{
            ...task,
            clientName: task.clientName || client.name,
            parentTaskTitle: task.parentTaskTitle.trim() || parentDemo?.title || "",
          }}
          deptLabel={dep?.name ?? demoTask.dept}
          subtitle={subtitle}
          showExport
          embedded={embedded}
          onClose={onClose}
        />

        <TaskDetailStatusBar status={task.status} disabled readOnlyHint={DEMO_READ_ONLY_HINT} />

        <TaskDetailCreatedBy
          creator={
            creator ?
              {
                name: creator.name,
                avatar: creator.avatar,
                hue: creator.hue,
                image: typeof creator.image === "string" ? creator.image : undefined,
              }
            : null
          }
          createdAt={demoTask.dueDate}
        />

        <TaskDetailOverview
          task={{ ...task, clientName: task.clientName || client.name }}
          mode="demo"
          readOnly
          readOnlyHint={DEMO_READ_ONLY_HINT}
          team={teamDemo}
          departments={departmentRowsDemo}
          clientsPicklist={[]}
          activityEntries={TASK_ACTIVITY_LOG[demoTask.id] ?? []}
          timeEntries={TIME_ENTRIES_TODAY.filter((e) => e.task === demoTask.id).map((e) => ({
            id: e.id,
            at: e.at,
            dur: e.dur,
            desc: e.desc,
            dept: e.dept,
          }))}
          dueReferenceIso={taskDueReferenceTodayIso()}
          highlightCommentId={highlightCommentId}
          subTasks={demoSubTasks}
          subTaskCreateContext={
            !task.isSubTask ?
              {
                parentTaskId: demoTask.id,
                parentTaskTitle: demoTask.title,
                departments: departmentRowsDemo.map((d) => ({
                  id: String(d.id),
                  name: typeof d.name === "string" ? d.name : String(d.id),
                })),
                team: teamDemo,
                clientsPicklist: [],
                readOnly: true,
              }
            : null
          }
          fieldStatus={NO_FIELD_STATUS}
          onFieldSave={noopFieldSave}
        />
      </div>
    );
  }

  if (dataSource === "database" && rTask) {
    const task = toFieldTask(rTask, taskId);
    const rClient =
      remote && typeof remote.client === "object" && remote.client !== null ?
        /** @type {Record<string, unknown>} */ (remote.client)
      : {};
    /** @type {Record<string, unknown> | null} */
    const rCreatedBy =
      remote && remote.createdBy && typeof remote.createdBy === "object" ?
        /** @type {Record<string, unknown>} */ (remote.createdBy)
      : null;

    /** @type {Record<string, unknown>[]} */
    const departmentRows =
      remote && Array.isArray(remote.departments) ? /** @type {Record<string, unknown>[]} */ (remote.departments) : [];
    /** @type {Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>} */
    const team =
      remote && Array.isArray(remote.team) ?
        /** @type {Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>} */ (remote.team)
      : [];
    /** @type {Array<{ value: string; label: string }>} */
    const clientsPick =
      remote && Array.isArray(remote.clientsPicklist) ?
        /** @type {Array<{ value: string; label: string }>} */ (remote.clientsPicklist)
      : [];
    /** @type {Array<{ id: string; at: string; dur: number; desc: string; dept?: string | null }>} */
    const timeMapped =
      remote && Array.isArray(remote.timeEntriesMapped) ?
        /** @type {Array<{ id: string; at: string; dur: number; desc: string; dept?: string | null }>} */ (
          remote.timeEntriesMapped
        )
      : [];
    /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */
    const dbActivity =
      remote && Array.isArray(remote.activityEntries) ?
        /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */ (remote.activityEntries)
      : [];
    /** @type {Array<Record<string, unknown>>} */
    const subTasks =
      remote && Array.isArray(remote.subTasks) ? /** @type {Array<Record<string, unknown>>} */ (remote.subTasks) : [];

    const parentTaskTitle =
      task.parentTaskTitle ||
      (remote && remote.parentTask && typeof remote.parentTask === "object" && typeof remote.parentTask.title === "string" ?
        remote.parentTask.title
      : "");
    const clientName = task.clientName || (typeof rClient.name === "string" ? String(rClient.name) : "—");
    const clientSlug =
      task.clientId || (typeof rClient.id === "string" ? rClient.id.trim() : "");

    const depKey = task.dept.trim() && task.dept !== "—" ? task.dept.trim() : "";
    const depMeta = departmentRows.find((d) => String(d.id) === depKey);
    const deptName =
      !depKey ? "—"
      : typeof depMeta?.name === "string" && depMeta.name.trim() ? depMeta.name
      : depKey;

    const subtitle =
      taskIsDone(task.status) ? "Afsluttet i CRM."
      : task.status === "blocked" ? "Blokeret — af dokumenteret clearance før genoptag."
      : "";

    const notice = deleteNotice ?? (saveError ? `${saveError} — ændringen er rullet tilbage.` : null);

    return (
      <div
        className={cn(
          "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
          loading && "opacity-65",
        )}
      >
        {error ?
          <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-4 py-2 font-sans text-[12px] text-agency-warn">
            {error} — viser seneste indlæste data hvor muligt.
          </p>
        : null}

        {notice ?
          <p
            role="alert"
            className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad"
          >
            {notice}
          </p>
        : null}

        <TaskDetailHeader
          trailing={
            <TaskDetailTimerMenu clientSlug={clientSlug} taskKey={task.id} taskTitle={task.title} billable={task.billable} />
          }
          task={{
            ...task,
            clientName,
            parentTaskId: task.parentTaskId || parentTaskId.trim(),
            parentTaskTitle,
          }}
          deptLabel={deptName}
          subtitle={subtitle}
          showExport={false}
          embedded={embedded}
          onClose={onClose}
          onTitleSave={(next) => saveField("title", { title: next }, { title: next })}
          titleStatus={fieldStatus.title ?? null}
        />

        <TaskDetailStatusBar
          status={task.status}
          onStatusChange={(next) => void saveField("status", taskStatusPatch(next), { status: next })}
          saving={fieldStatus.status === "saving"}
          saved={fieldStatus.status === "saved"}
        />

        <TaskDetailCreatedBy
          creator={
            rCreatedBy && typeof rCreatedBy.name === "string" ?
              {
                name: rCreatedBy.name,
                avatar: typeof rCreatedBy.avatar === "string" ? rCreatedBy.avatar : undefined,
                hue: typeof rCreatedBy.hue === "number" ? rCreatedBy.hue : undefined,
                image: typeof rCreatedBy.image === "string" ? rCreatedBy.image : undefined,
              }
            : null
          }
          createdAt={
            typeof rTask.createdAt === "string" ? rTask.createdAt
            : typeof rTask.createdAtIso === "string" ? rTask.createdAtIso
            : ""
          }
        />

        <TaskDetailOverview
          task={{ ...task, clientName }}
          mode="database"
          readOnly={false}
          team={team}
          departments={departmentRows}
          clientsPicklist={clientsPick}
          activityEntries={dbActivity.map((e) => ({ ...e, body: e.summary }))}
          timeEntries={timeMapped}
          dueReferenceIso={taskDueReferenceTodayIso()}
          highlightCommentId={highlightCommentId}
          subTasks={subTasks}
          subTaskCreateContext={
            !task.isSubTask ?
              {
                parentTaskId: task.id,
                parentTaskTitle: task.title || "Hovedopgave",
                departments: departmentRows.map((d) => ({
                  id: String(d.id),
                  name: typeof d.name === "string" ? d.name : String(d.id),
                })),
                team,
                clientsPicklist: clientsPick,
                onSubTaskCreated: () => void loadRemote({ silent: true }),
              }
            : null
          }
          fieldStatus={fieldStatus}
          onFieldSave={saveField}
          onDelete={() => void deleteTask()}
          deleting={deleting}
        />
      </div>
    );
  }

  if (dataSource === "database" && error && !rTask) {
    return (
      <div className="space-y-4">
        <TaskDetailHeader
          task={{
            id: taskId,
            title: "Opgave",
            status: "todo",
            priority: "medium",
            dept: "—",
            clientName: "—",
            clientLogo: "?",
            clientHue: 220,
          }}
          deptLabel="—"
          subtitle="Kunne ikke indlæse opgaven."
          showExport={false}
          embedded={embedded}
          onClose={onClose}
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error}{" "}
          <Link href={routes.tasks} className="font-medium underline">
            Tilbage til Opgaver
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "database") {
    return (
      <div className="space-y-4">
        <TaskDetailHeader
          task={{
            id: taskId,
            title: "Indlæser…",
            status: "todo",
            priority: "medium",
            dept: "—",
            clientName: "…",
            clientLogo: "?",
            clientHue: 220,
          }}
          deptLabel="—"
          subtitle="Vent på CRM-data."
          showExport={false}
          embedded={embedded}
          onClose={onClose}
        />
        <div className="space-y-3">
          <div className="h-8 animate-pulse rounded-lg bg-skeleton" />
          <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
        </div>
      </div>
    );
  }

  return null;
}
