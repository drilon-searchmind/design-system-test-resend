"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  TASK_DETAIL_TAB_IDS,
  TaskDetailTabbedBody,
} from "@/components/tasks/task-detail-tabbed-body";
import { TaskDetailEditForm } from "@/components/tasks/task-detail-edit-form";
import { TaskDetailCreatedBy } from "@/components/tasks/task-detail-created-by";
import { TaskDetailHeader } from "@/components/tasks/task-detail-header";
import { TaskDetailStatusBar } from "@/components/tasks/task-detail-status-bar";
import { ClientDetailEditActions } from "@/components/clients/client-detail-edit-actions";
import { useDataSource } from "@/components/crm/use-data-source";
import { routes } from "@/config/routes";
import {
  CLIENTS,
  CONTRACTS,
  DEPARTMENTS,
  SMART_ALERTS,
  TASK_ACTIVITY_LOG,
  TASKS,
  TEAM,
  TIME_ENTRIES_TODAY,
} from "@/lib/crm/static-data";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { editDraftToPatch, taskStatusPatch, taskWireToEditDraft } from "@/lib/crm/task-edit-utils";
import {
  sanitizeTaskUiStatus,
  taskDaysUntilDue,
  taskDueReferenceTodayIso,
  taskIsDone,
  taskIsOverdue,
} from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{ taskId: string; initialTab?: string; highlightCommentId?: string }} props
 */
export function TaskDetailShell({ taskId, initialTab = "", highlightCommentId = "" }) {
  const router = useRouter();
  const dataSource = useDataSource();
  const defaultTab = TASK_DETAIL_TAB_IDS[0];
  const resolvedInitialTab =
    TASK_DETAIL_TAB_IDS.includes(/** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (initialTab)) ?
      /** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (initialTab)
    : defaultTab;
  const [detailTab, setDetailTab] = useState(resolvedInitialTab);
  const [remote, setRemote] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(/** @type {import('@/lib/crm/task-edit-utils').TaskEditDraft | null} */ (null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [editNotice, setEditNotice] = useState(/** @type {string | null} */ (null));

  const loadRemote = useCallback(async () => {
    setEditNotice(null);
    setLoading(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente opgaven");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  useEffect(() => {
    if (initialTab && TASK_DETAIL_TAB_IDS.includes(/** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (initialTab))) {
      setDetailTab(/** @type {(typeof TASK_DETAIL_TAB_IDS)[number]} */ (initialTab));
    }
  }, [initialTab]);

  const startEdit = useCallback(() => {
    if (!remote || typeof remote.task !== "object" || remote.task === null) return;
    setDraft(taskWireToEditDraft(/** @type {Record<string, unknown>} */ (remote.task)));
    setEditNotice(null);
    setEditing(true);
  }, [remote]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setEditNotice(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setEditNotice("Titel er påkrævet.");
      return;
    }
    if (!draft.clientSlug.trim()) {
      setEditNotice("Vælg en kunde.");
      return;
    }

    setSaving(true);
    setEditNotice(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraftToPatch(draft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      setEditing(false);
      setDraft(null);
      await loadRemote();
      router.refresh();
    } catch (e) {
      setEditNotice(e instanceof Error ? e.message : "Fejl ved gem");
    } finally {
      setSaving(false);
    }
  }, [draft, loadRemote, router, taskId]);

  const deleteTask = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slette denne opgave permanent? Handlingen kan ikke fortrydes.")
    ) {
      return;
    }
    setDeleting(true);
    setEditNotice(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      router.push(routes.tasks);
    } catch (e) {
      setEditNotice(e instanceof Error ? e.message : "Fejl ved sletning");
    } finally {
      setDeleting(false);
    }
  }, [router, taskId]);

  const updateStatus = useCallback(
    async (nextStatus) => {
      setStatusSaving(true);
      setEditNotice(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskStatusPatch(nextStatus)),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke opdatere status");
        await loadRemote();
        router.refresh();
      } catch (e) {
        setEditNotice(e instanceof Error ? e.message : "Fejl ved status");
      } finally {
        setStatusSaving(false);
      }
    },
    [loadRemote, router, taskId],
  );

  /** @type {Record<string, unknown>[]} */
  const departmentRowsMongo = useMemo(() => {
    const raw = remote && Array.isArray(remote.departments) ? remote.departments : [];
    return /** @type {Record<string, unknown>[]} */ (raw);
  }, [remote]);

  const demoTask = TASKS.find((t) => t.id === taskId);
  const dueRefDemo = taskDueReferenceTodayIso();

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
    const ctrId = `ctr-${demoTask.clientId}`;
    const contract = CONTRACTS.find((c) => c.id === ctrId);
    const assignee = TEAM.find((m) => m.id === demoTask.assigneeId) ?? null;
    const demoActivity = TASK_ACTIVITY_LOG[demoTask.id] ?? [];
    const timeDemo = TIME_ENTRIES_TODAY.filter((e) => e.task === demoTask.id);
    const dep = DEPARTMENTS.find((d) => d.id === demoTask.dept);
    const done = taskIsDone(demoTask.status);
    const overdue = taskIsOverdue(demoTask, dueRefDemo);
    const days = !done ? taskDaysUntilDue(demoTask.dueDate, dueRefDemo) : null;

    const subtitle = done
      ? "Afsluttet på board."
      : demoTask.status === "blocked"
        ? "Blokket — afvent dokumenteret clearance."
        : overdue && typeof days === "number"
          ? `${Math.abs(days)} kalenderdage over deadline.`
          : days === 0
            ? "Deadline i dag."
            : typeof days === "number"
              ? `${days} d til deadline.`
              : "Åben leverance.";

    if (!client || !contract) {
      return (
        <p className="font-sans text-[13px] text-fg-muted">
          Mangler tilknyttet kunde eller kontrakt. <Link href={routes.tasks}>Tilbage</Link>
        </p>
      );
    }

    /** @type {Record<string, unknown>[]} */
    const departmentRowsDemo = DEPARTMENTS.map((d) =>
      /** @type {Record<string, unknown>} */ ({
        ...d,
        short: typeof d.short === "string" ? d.short : d.id,
      }),
    );

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TaskDetailHeader
          task={{
            id: demoTask.id,
            title: demoTask.title,
            status: sanitizeTaskUiStatus(demoTask.status),
            priority:
              demoTask.priority === "high" || demoTask.priority === "low"
                ? demoTask.priority
                : "medium",
            dept: demoTask.dept,
            clientName: demoTask.clientName,
            clientLogo: demoTask.clientLogo,
            clientHue: demoTask.clientHue,
          }}
          deptLabel={dep?.name ?? demoTask.dept}
          subtitle={subtitle}
          showExport
        />

        <TaskDetailStatusBar
          status={sanitizeTaskUiStatus(demoTask.status)}
          disabled
          readOnlyHint="Skift til database-tilstand for at opdatere status."
        />

        <TaskDetailCreatedBy
          creator={
            assignee ?
              {
                name: assignee.name,
                avatar: assignee.avatar,
                hue: assignee.hue,
                image: typeof assignee.image === "string" ? assignee.image : undefined,
              }
            : null
          }
          createdAt={demoTask.dueDate}
        />

        <TaskDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          taskRow={demoTask}
          assigneePulse={assignee}
          departments={departmentRowsDemo}
          alerts={SMART_ALERTS}
          demoActivity={demoActivity}
          dbActivity={[]}
          clientRow={{
            ...client,
            industry: typeof client.industry === "string" ? client.industry : "",
          }}
          contractWire={contract}
          dueReferenceIso={dueRefDemo}
          timeEntries={timeDemo.map((e) => ({
            id: e.id,
            at: e.at,
            dur: e.dur,
            desc: e.desc,
            dept: e.dept,
          }))}
          mode="demo"
          activityFootnote={undefined}
          highlightCommentId={highlightCommentId}
        />

        <p className="font-sans text-[12px] text-fg-quiet">
          Redigering er kun tilgængelig i database-tilstand.
        </p>
      </div>
    );
  }

  /** @type {Record<string, unknown> | undefined} */
  const rTask = remote && typeof remote.task === "object" && remote.task !== null ?
    /** @type {Record<string, unknown>} */ (remote.task)
  : undefined;

  if (dataSource === "database" && rTask) {
    const rClientRaw = remote && remote.client != null ? remote.client : {};
    /** @type {Record<string, unknown>} */
    const rClient =
      typeof rClientRaw === "object" && rClientRaw !== null ?
        /** @type {Record<string, unknown>} */ (rClientRaw)
      : {};
    /** @type {Record<string, unknown> | null} */
    const rContract =
      remote && remote.contract && typeof remote.contract === "object" ?
        /** @type {Record<string, unknown>} */ (remote.contract)
      : null;
    /** @type {Record<string, unknown> | null} */
    const rAssignee =
      remote && remote.assignee && typeof remote.assignee === "object" ?
        /** @type {Record<string, unknown>} */ (remote.assignee)
      : null;

    /** @type {Record<string, unknown> | null} */
    const rCreatedBy =
      remote && remote.createdBy && typeof remote.createdBy === "object" ?
        /** @type {Record<string, unknown>} */ (remote.createdBy)
      : null;

    const dueRef = taskDueReferenceTodayIso();

    const done = taskIsDone(String(rTask.status ?? ""));
    const overdue =
      typeof rTask.dueDate === "string" ?
        taskIsOverdue({ status: String(rTask.status), dueDate: rTask.dueDate }, dueRef)
      : false;
    const days =
      typeof rTask.dueDate === "string" ? taskDaysUntilDue(rTask.dueDate, dueRef) : null;
    const st = String(rTask.status ?? "todo");

    const subtitle =
      done
        ? "Afsluttet i CRM."
        : st === "blocked"
          ? "Blokeret — af dokumenteret clearance før genoptag."
          : overdue && typeof days === "number"
            ? `${Math.abs(days)} d over deadline.`
            : days === 0
              ? "Deadline i dag."
              : typeof days === "number"
                ? `${days} d til deadline.`
                : "Åben leverance.";

    const depKey = typeof rTask.dept === "string" ? rTask.dept.trim() || "—" : "—";
    const depMeta = departmentRowsMongo.find((d) => String(d.id) === depKey);
    const deptName =
      depKey !== "—" ?
        typeof depMeta?.name === "string" && depMeta.name.trim()
          ? depMeta.name
          : depKey
      : "—";

    const timeMapped =
      remote && Array.isArray(remote.timeEntriesMapped) ?
        /** @type {Array<{ id: string; at: string; dur: number; desc: string; dept?: string | null }>} */ (
          remote.timeEntriesMapped
        )
      : [];

    const dbActivityRaw =
      remote && Array.isArray(remote.activityEntries) ? remote.activityEntries : [];
    /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */
    const dbActivity =
      /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */ (dbActivityRaw);

    const clientsPickRaw =
      remote && Array.isArray(remote.clientsPicklist) ? remote.clientsPicklist : [];
    /** @type {Array<{ value: string; label: string }>} */
    const clientsPick =
      /** @type {Array<{ value: string; label: string }>} */ (clientsPickRaw);

    /** @type {Array<{ id: string; name: string }>} */
    const teamWire =
      remote && Array.isArray(remote.team) ? /** @type {Array<{ id: string; name: string }>} */ (remote.team) : [];

    /** @type {Array<{ id: string; name?: string }>} */
    const deptWire =
      remote && Array.isArray(remote.departments) ?
        /** @type {Array<{ id: string; name?: string }>} */ (remote.departments)
      : [];

    /** @type {Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>} */
    const teamFull =
      remote && Array.isArray(remote.team) ?
        /** @type {Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>} */ (
          remote.team
        )
      : [];

    const alerts =
      remote && Array.isArray(remote.alerts) ? /** @type {unknown[]} */ (remote.alerts) : [];

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

        {editNotice ?
          <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad">
            {editNotice}
          </p>
        : null}

        <TaskDetailHeader
          trailing={
            <div className="flex flex-col items-end gap-2">
              <ClientDetailEditActions
                editing={editing}
                saving={saving}
                onEdit={startEdit}
                onSave={() => void saveEdit()}
                onCancel={cancelEdit}
              />
              {editing ?
                <span className="text-right font-sans text-[10px] text-fg-quiet">
                  Redigerer opgave — gem eller annuller
                </span>
              : null}
            </div>
          }
          task={{
            id: typeof rTask.id === "string" ? rTask.id : taskId,
            title: typeof rTask.title === "string" ? rTask.title : "—",
            status: sanitizeTaskUiStatus(st),
            priority:
              rTask.priority === "high" || rTask.priority === "low"
                ? rTask.priority
                : /** @type {'medium'} */ ("medium"),
            dept: typeof rTask.dept === "string" ? rTask.dept : "",
            clientName:
              typeof rTask.clientName === "string"
                ? rTask.clientName
                : typeof rClient.name === "string"
                  ? String(rClient.name)
                  : "—",
            clientLogo: typeof rTask.clientLogo === "string" ? rTask.clientLogo : "?",
            clientHue: typeof rTask.clientHue === "number" ? rTask.clientHue : 220,
          }}
          deptLabel={deptName}
          subtitle={subtitle}
          showExport={false}
        />

        <TaskDetailStatusBar
          status={sanitizeTaskUiStatus(st)}
          onStatusChange={(next) => void updateStatus(next)}
          saving={statusSaving}
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

        {editing && draft ?
          <TaskDetailEditForm
            draft={draft}
            onChange={setDraft}
            departments={deptWire}
            team={teamWire}
            clientsPicklist={clientsPick}
            deleting={deleting}
            onDelete={() => void deleteTask()}
          />
        : <TaskDetailTabbedBody
            tab={detailTab}
            onTabChange={setDetailTab}
            taskRow={{ ...rTask, id: typeof rTask.id === "string" ? rTask.id : taskId }}
            assigneePulse={rAssignee}
            departments={departmentRowsMongo}
            alerts={alerts}
            demoActivity={[]}
            dbActivity={dbActivity}
            contractWire={rContract}
            clientRow={{
              id: typeof rClient.id === "string" ? rClient.id : "",
              name: typeof rClient.name === "string" ? String(rClient.name) : "",
              industry: typeof rClient.industry === "string" ? String(rClient.industry) : undefined,
            }}
            dueReferenceIso={dueRef}
            timeEntries={timeMapped}
            mode="database"
            activityFootnote={undefined}
            team={teamFull}
            highlightCommentId={highlightCommentId}
          />
        }
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
