import mongoose from "mongoose";

import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
import { enrichClientRetainer, sumContributingContractRetainer } from "@/lib/crm/retainer-utils";
import {
  endOfReportMonth,
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import {
  TASK_TERMINAL_STATUSES,
  buildTasksPortfolioMongoFilter,
} from "@/lib/crm/tasks-portfolio-filter";
import { sanitizeTaskUiStatus, taskDueReferenceTodayIso, TASK_UI_STATUSES } from "@/lib/crm/task-utils";
import { realCalendarSlotsFromMongoDoc } from "@/lib/crm/calendar-slots";
import { toLocalIsoDateTime } from "@/lib/crm/calendar-task-schedule";
import { sanitizeCommentHtml } from "@/lib/crm/comment-html";
import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TaskTemplate from "@/lib/db/models/task-template";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { connectDb } from "@/lib/db/mongoose";
import { buildContractWireRow, contractToIsoDateOnly, mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { enrichMembersWithUserImages, userImageByUserId } from "@/lib/server/member-user-images";
import { notifyTaskAssigned } from "@/lib/server/notifications-data";
import { resolveTaskActorFromSession } from "@/lib/server/task-actor";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

function colorTokenToVar(token) {
  if (!token) return "var(--agency-dep-seo)";
  const t = String(token ?? "");
  if (t.startsWith("#") || t.startsWith("oklch") || t.startsWith("rgb")) return t;
  if (t.startsWith("--")) return `var(${t})`;
  return `var(--${t})`;
}

/**
 * @param {Record<string, unknown>} doc
 */
export function mapDepartmentTaskRow(doc) {
  const key = String(doc.key ?? "");
  return {
    id: key,
    name: String(doc.name ?? key),
    short: String(doc.shortLabel ?? key).slice(0, 4),
    color: colorTokenToVar(doc.colorToken ?? key),
    capacity: typeof doc.capacityHours === "number" ? doc.capacityHours : 0,
  };
}

const PRIOS = /** @type {const} */ (["high", "medium", "low"]);

/** @param {Record<string, unknown>} taskDoc */
function normalizeAssigneeMemberKeysFromDoc(taskDoc) {
  const fromArray = Array.isArray(taskDoc.assigneeMemberKeys) ?
    taskDoc.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
  : [];
  if (fromArray.length) return [...new Set(fromArray)];
  const single = typeof taskDoc.assigneeMemberKey === "string" ? taskDoc.assigneeMemberKey.trim() : "";
  return single ? [single] : [];
}

/**
 * @param {Record<string, unknown>} body
 * @param {Record<string, unknown>} scope
 */
async function resolveAssigneeMemberKeysFromBody(body, scope) {
  /** @type {string[]} */
  let rawKeys = [];
  if (Array.isArray(body.assigneeMemberKeys)) {
    rawKeys = body.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean);
  } else if (typeof body.assigneeMemberKey === "string" && body.assigneeMemberKey.trim()) {
    rawKeys = [body.assigneeMemberKey.trim()];
  }
  rawKeys = [...new Set(rawKeys)];

  /** @type {string[]} */
  const resolved = [];
  /** @type {mongoose.Types.ObjectId[]} */
  const memberIds = [];

  for (const key of rawKeys) {
    const memDoc = await TeamMember.findOne(
      /** @type {Record<string, unknown>} */ (andQuery(/** @type {Record<string, unknown>} */ (scope), { key })),
    )
      .select("_id key")
      .lean();
    if (memDoc?.key != null && memDoc._id) {
      resolved.push(String(memDoc.key));
      memberIds.push(/** @type {mongoose.Types.ObjectId} */ (memDoc._id));
    }
  }

  return { keys: resolved, memberIds };
}

/**
 * @param {Record<string, unknown>} taskDoc
 * @param {Record<string, unknown>} clientDoc
 * @param {{ parentTitle?: string; parentPriority?: string; parentClientDoc?: Record<string, unknown> | null; calendarUserId?: string }} [extras]
 */
export function buildTaskWireRow(taskDoc, clientDoc, extras = {}) {
  const slug = String(clientDoc.slug ?? clientDoc._id);
  const oid = typeof taskDoc._id !== "undefined" && taskDoc._id !== null ? String(taskDoc._id) : "";

  const id = oid;

  const logo = String(clientDoc.logoInitials ?? "?");
  let st = String(taskDoc.status ?? "todo");
  if (!TASK_UI_STATUSES.includes(/** @type {any} */ (st))) st = "todo";

  /** @type {(typeof TASK_UI_STATUSES)[number]} */
  const status = /** @type {any} */ (st);

  const isSubTask = taskDoc.isSubTask === true;
  const parentTaskId =
    taskDoc.parentTaskId != null && String(taskDoc.parentTaskId).trim()
      ? String(taskDoc.parentTaskId)
      : "";

  let prio = String(taskDoc.priority ?? "medium");
  if (isSubTask && extras.parentPriority && PRIOS.includes(/** @type {any} */ (extras.parentPriority))) {
    prio = extras.parentPriority;
  }
  if (!PRIOS.includes(/** @type {any} */ (prio))) prio = "medium";
  /** @type {(typeof PRIOS)[number]} */
  const priority = /** @type {any} */ (prio);

  const effectiveClientDoc =
    isSubTask && extras.parentClientDoc && typeof extras.parentClientDoc === "object"
      ? extras.parentClientDoc
      : clientDoc;

  const assigneeIds = normalizeAssigneeMemberKeysFromDoc(taskDoc);

  const calendarUserId =
    typeof extras.calendarUserId === "string" ? extras.calendarUserId.trim() : "";
  const calendarSlots = realCalendarSlotsFromMongoDoc(taskDoc, {
    calendarUserId: calendarUserId || undefined,
  });
  const hideLegacySchedule = Boolean(calendarUserId);

  return {
    id,
    mongoId: oid,
    title: String(taskDoc.title ?? "—"),
    hint: typeof taskDoc.hint === "string" ? taskDoc.hint : "",
    description: typeof taskDoc.description === "string" ? taskDoc.description : "",
    clientId: String(effectiveClientDoc.slug ?? effectiveClientDoc._id ?? slug),
    clientName: String(effectiveClientDoc.name ?? "—"),
    clientLogo: (String(effectiveClientDoc.logoInitials ?? logo ?? "?").trim().slice(0, 2).toUpperCase() || "?").slice(
      0,
      2,
    ),
    clientHue: typeof effectiveClientDoc.hue === "number" ? effectiveClientDoc.hue : 220,
    assigneeId: assigneeIds[0] ?? "",
    assigneeIds,
    dept: String(taskDoc.departmentKey ?? "").trim() || "—",
    status,
    priority,
    dueDate: contractToIsoDateOnly(taskDoc.dueDate) || "",
    scheduledStart:
      hideLegacySchedule ? ""
      : taskDoc.scheduledStart instanceof Date ?
        toLocalIsoDateTime(taskDoc.scheduledStart)
      : typeof taskDoc.scheduledStart === "string" && taskDoc.scheduledStart ?
        taskDoc.scheduledStart
      : "",
    scheduledEnd:
      hideLegacySchedule ? ""
      : taskDoc.scheduledEnd instanceof Date ?
        toLocalIsoDateTime(taskDoc.scheduledEnd)
      : typeof taskDoc.scheduledEnd === "string" && taskDoc.scheduledEnd ?
        taskDoc.scheduledEnd
      : "",
    calendarSlots,
    billable: taskDoc.billable !== false,
    estimateHours:
      typeof taskDoc.estimateHours === "number" && Number.isFinite(taskDoc.estimateHours)
        ? taskDoc.estimateHours
        : null,
    loggedHours:
      typeof taskDoc.loggedHours === "number" && Number.isFinite(taskDoc.loggedHours) ? taskDoc.loggedHours : 0,
    createdByMemberKey:
      typeof taskDoc.createdByMemberKey === "string" ? taskDoc.createdByMemberKey.trim() : "",
    createdAt: contractToIsoDateOnly(taskDoc.createdAt) || "",
    updatedAt: contractToIsoDateOnly(taskDoc.updatedAt) || "",
    isSubTask,
    parentTaskId,
    parentTaskTitle: extras.parentTitle ?? "",
  };
}

/**
 * Enrich wire rows with parent titles and inherited client/priority for delopgaver.
 * @param {ReturnType<typeof buildTaskWireRow>[]} tasks
 * @param {Record<string, unknown>} scope
 */
export async function enrichTaskWireRowsWithParents(tasks, scope) {
  const subRows = tasks.filter((t) => t.isSubTask && t.parentTaskId);
  if (!subRows.length) return tasks;

  const parentIds = [...new Set(subRows.map((t) => t.parentTaskId).filter(Boolean))];
  /** @type {Record<string, Record<string, unknown>>} */
  const parentById = {};
  const parentOids = parentIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (!parentOids.length) return tasks;

  const parentDocs = await Task.find(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: { $in: parentOids } }))
    ),
  )
    .select("_id title priority clientId clientSlug isSubTask")
    .lean();

  for (const p of Array.isArray(parentDocs) ? parentDocs : []) {
    if (p?._id != null) parentById[String(p._id)] = /** @type {Record<string, unknown>} */ (p);
  }

  const clientIds = [
    ...new Set(
      Object.values(parentById)
        .map((p) => String(p.clientId ?? ""))
        .filter(Boolean),
    ),
  ];
  const clientById = clientIds.length ? await lookupClientForTasks(clientIds, scope) : {};

  return tasks.map((row) => {
    if (!row.isSubTask || !row.parentTaskId) return row;
    const parent = parentById[row.parentTaskId];
    if (!parent) return row;
    const parentClientId = String(parent.clientId ?? "");
    const parentClientDoc = parentClientId ? clientById[parentClientId] : null;
    let parentPrio = String(parent.priority ?? "medium");
    if (!PRIOS.includes(/** @type {any} */ (parentPrio))) parentPrio = "medium";
    return {
      ...row,
      parentTaskTitle: String(parent.title ?? ""),
      priority: /** @type {"high" | "medium" | "low"} */ (/** @type {unknown} */ (parentPrio)),
      ...(parentClientDoc ?
        {
          clientId: String(parentClientDoc.slug ?? parentClientDoc._id ?? row.clientId),
          clientName: String(parentClientDoc.name ?? row.clientName),
          clientLogo: (String(parentClientDoc.logoInitials ?? row.clientLogo).trim().slice(0, 2).toUpperCase() ||
            row.clientLogo),
          clientHue: typeof parentClientDoc.hue === "number" ? parentClientDoc.hue : row.clientHue,
        }
      : {}),
    };
  });
}

/** @param {import('@/lib/crm/pulse-types').PulseClient} c */
function alertsForOneClient(c) {
  /** @type {import('@/lib/crm/pulse-types').PulseSmartAlert[]} */
  const out = [];
  if (c.status !== "active") return out;

  if (c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget * 1.05) {
    const pct = Math.round((c.hoursThisMonth / c.hoursBudget - 1) * 100);
    out.push({
      id: `tsk-over-${c.id}`,
      severity: pct > 20 ? "bad" : "warn",
      client: c.id,
      type: "overBudget",
      title: `${c.name} — ${pct}% over budget`,
      body: `${c.hoursThisMonth.toFixed(1)} / ${c.hoursBudget} t i perioden.`,
      age: "nu",
    });
  }

  if (c.health === "bad") {
    out.push({
      id: `tsk-health-${c.id}`,
      severity: "bad",
      client: c.id,
      type: "health",
      title: `${c.name} — sundhed kritisk`,
      body: "",
      age: "—",
    });
  }
  return out;
}

async function lookupClientForTasks(clientIdsHex, scope) {
  /** @type {Record<string, Record<string, unknown>>} */
  const byId = {};
  if (!clientIdsHex.length) return byId;
  const rows = await Client.find(
    /** @type {Record<string, unknown>} */ ({
      _id: { $in: clientIdsHex.map((id) => new mongoose.Types.ObjectId(id)) },
      ...scope,
    }),
  )
    .lean()
    .exec();
  const arr = Array.isArray(rows) ? rows : [];
  for (const c of arr) {
    byId[String(c._id)] = c;
  }
  return byId;
}

/**
 * @param {{ includeTest?: boolean; year?: number; month?: number; mineAssigneeKey?: string }} opts
 */
export async function fetchTasksPortfolio(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  const { year, month } = normalizeReportPeriod(opts);
  const overdueRefIso = taskDueReferenceTodayIso();
  const mineKey = opts.mineAssigneeKey ? String(opts.mineAssigneeKey).trim() : "";

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const periodOr = buildTasksPortfolioMongoFilter(year, month);

  const [tasksRaw, depRaw, teamRaw, clientPickRaw, tplRaw] = await Promise.all([
    Task.find(andQuery(scope, /** @type {Record<string, unknown>} */ (periodOr)))
      .sort({ dueDate: 1 })
      .lean(),
    Department.find(/** @type {Record<string, unknown>} */ (scope)).sort({ name: 1 }).lean(),
    TeamMember.find(
      /** @type {Record<string, unknown>} */ ({ ...scope, active: { $ne: false } }),
    )
      .sort({ name: 1 })
      .lean(),
    Client.find(/** @type {Record<string, unknown>} */ (scope))
      .select("slug name logoInitials hue")
      .sort({ name: 1 })
      .lean(),
    TaskTemplate.find(
      /** @type {Record<string, unknown>} */ (andQuery(/** @type {Record<string, unknown>} */ (scope), { active: { $ne: false } })),
    )
      .sort({ title: 1 })
      .select("key title description departmentKey defaultPriority suggestedHours defaultDueOffsetDays")
      .lean(),
  ]);

  const taskDocs = Array.isArray(tasksRaw) ? tasksRaw : [];
  const ids = [...new Set(taskDocs.map((t) => String(t.clientId)))];
  const clientByIdFromTasks = ids.length ? await lookupClientForTasks(ids, scope) : {};
  /** @type {Record<string, Record<string, unknown>>} */
  const merged = {};
  const pickDocs = Array.isArray(clientPickRaw) ? clientPickRaw : [];

  pickDocs.forEach((c) => {
    merged[String(c._id)] = c;
  });
  ids.forEach((id) => {
    if (!merged[id] && clientByIdFromTasks[id]) {
      merged[id] = clientByIdFromTasks[id];
    }
  });

  /** @type {ReturnType<typeof buildTaskWireRow>[]} */
  const tasksBuilt = [];
  for (const td of taskDocs) {
    const cid = String(td.clientId);
    const cd = merged[cid];
    if (!cd) continue;
    tasksBuilt.push(buildTaskWireRow(td, cd));
  }

  const tasks = await enrichTaskWireRowsWithParents(tasksBuilt, scope);

  const departments = (Array.isArray(depRaw) ? depRaw : []).map(mapDepartmentTaskRow);
  const teamDocs = Array.isArray(teamRaw) ? teamRaw : [];
  const teamEnriched = await enrichMembersWithUserImages(teamDocs);
  const team = teamEnriched.map(mapTeamMemberFromMongo);
  const clientsPicklist = pickDocs.map((d) => ({
    value: String(d.slug ?? ""),
    label: String(d.name ?? d.slug ?? "—"),
  }));

  const tplDocs = Array.isArray(tplRaw) ? tplRaw : [];
  const taskTemplatesForCreate = tplDocs.map((tpl) => {
    const tplRec = /** @type {Record<string, unknown>} */ (tpl);
    const oid = typeof tplRec._id !== "undefined" && tplRec._id != null ? String(tplRec._id) : "";
    const keyTrim = typeof tplRec.key === "string" ? tplRec.key.trim() : "";
    const key = keyTrim || (oid ? `tpl-${oid.slice(-8)}` : "");

    let pr = String(tplRec.defaultPriority ?? "medium");
    if (!PRIOS.includes(/** @type {any} */ (pr))) pr = "medium";

    const sug =
      typeof tplRec.suggestedHours === "number" && Number.isFinite(tplRec.suggestedHours) ?
        tplRec.suggestedHours
      : null;
    const dod =
      typeof tplRec.defaultDueOffsetDays === "number" && Number.isFinite(tplRec.defaultDueOffsetDays) ?
        tplRec.defaultDueOffsetDays
      : 0;

    return {
      key,
      title: String(tplRec.title ?? "—"),
      hint: typeof tplRec.description === "string" ? tplRec.description : "",
      departmentKey: String(tplRec.departmentKey ?? "").trim(),
      priority: /** @type {"high" | "medium" | "low"} */ (
        /** @type {unknown} */ (pr)
      ),
      suggestedHours: sug,
      defaultDueOffsetDays: dod,
      assigneeMemberKeys: Array.isArray(tplRec.assigneeMemberKeys) ?
        tplRec.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
      : [],
      billable: tplRec.billable !== false,
    };
  });

  const openCount = tasks.filter((t) => !TASK_TERMINAL_STATUSES.includes(t.status)).length;
  const overdueCount = tasks.filter(
    (t) =>
      !TASK_TERMINAL_STATUSES.includes(t.status) &&
      Boolean(t.dueDate && String(t.dueDate) < overdueRefIso),
  ).length;
  const mineCount =
    mineKey ?
      tasks.filter((t) => {
        const ids = t.assigneeIds.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
        return ids.includes(mineKey);
      }).length
    : 0;
  const highOpen = tasks.filter((t) => !TASK_TERMINAL_STATUSES.includes(t.status) && t.priority === "high").length;

  return {
    source: /** @type {const} */ ("database"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    taskDueReferenceIso: overdueRefIso,
    overdueRefIso,
    mineAssigneeKey: mineKey || "",
    tasks,
    departments,
    team,
    clientsPicklist,
    taskTemplatesForCreate,
    summary: {
      total: tasks.length,
      openCount,
      overdueCount,
      mineCount,
      highOpen,
    },
  };
}

/** @param {Record<string, unknown>} body */
async function findClientForMutation(body, scope) {
  const slug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : "";
  const cidRaw = typeof body.clientId === "string" ? body.clientId.trim() : "";
  /** @type {Record<string, unknown>[]} */
  const clauses = [];
  if (slug) clauses.push({ slug });
  if (mongoose.Types.ObjectId.isValid(cidRaw)) clauses.push({ _id: new mongoose.Types.ObjectId(cidRaw) });

  if (!clauses.length) return null;
  /** @type {Record<string, unknown>} */
  const q = clauses.length === 1 ? clauses[0] : { $or: clauses };
  const doc = await Client.findOne(andQuery(scope, /** @type {Record<string, unknown>} */ (q))).lean();
  return doc && typeof doc === "object" ? doc : null;
}

/** @param {Record<string, unknown>} body @param {boolean} includeTest @param {import('next-auth').Session | null} [session] */
export async function createTaskMongo(body, includeTest, session = null) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "Titel mangler", status: 400 };

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  const parentIdRaw = typeof body.parentTaskId === "string" ? body.parentTaskId.trim() : "";
  /** @type {Record<string, unknown> | null} */
  let parentDoc = null;
  if (parentIdRaw) {
    if (!mongoose.Types.ObjectId.isValid(parentIdRaw)) {
      return { error: "Ugyldig hovedopgave", status: 400 };
    }
    const parentRaw = await Task.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(parentIdRaw) }))
      ),
    ).lean();
    parentDoc = parentRaw != null ? /** @type {Record<string, unknown>} */ (parentRaw) : null;
    if (!parentDoc?._id) return { error: "Hovedopgave ikke fundet", status: 400 };
    if (parentDoc.isSubTask === true) {
      return { error: "Delopgaver kan ikke have underopgaver", status: 400 };
    }
  }

  /** @type {Record<string, unknown> | null} */
  let clientDocObj = null;
  if (parentDoc?.clientId) {
    const clientFromParent = await Client.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: parentDoc.clientId }))
      ),
    ).lean();
    clientDocObj = clientFromParent != null ? /** @type {Record<string, unknown>} */ (clientFromParent) : null;
  } else {
    clientDocObj = await findClientForMutation(body, /** @type {Record<string, unknown>} */ (scope));
  }
  if (!clientDocObj) return { error: "Kunde ikke fundet", status: 400 };

  const tplKeyReq = typeof body.templateKey === "string" ? body.templateKey.trim() : "";
  const tplOidReq = typeof body.templateId === "string" ? body.templateId.trim() : "";
  /** @type {Record<string, unknown> | null} */
  let tplDoc = null;
  if (tplKeyReq || mongoose.Types.ObjectId.isValid(tplOidReq)) {
    /** @type {Record<string, unknown>[]} */
    const orTpl = [];
    if (tplKeyReq) orTpl.push({ key: tplKeyReq });
    if (mongoose.Types.ObjectId.isValid(tplOidReq)) orTpl.push({ _id: new mongoose.Types.ObjectId(tplOidReq) });
    const foundTpl = await TaskTemplate.findOne(
      andQuery(/** @type {Record<string, unknown>} */ (scope), /** @type {Record<string, unknown>} */ ({ $or: orTpl })),
    ).lean();
    tplDoc =
      foundTpl != null ? /** @type {Record<string, unknown>} */ (foundTpl)
      : null;
    if (!tplDoc?._id) return { error: "Skabelon ikke fundet", status: 400 };
    if (tplDoc.active === false) return { error: "Skabelon er inaktiv", status: 400 };
  }

  /** @type {string | undefined} */
  let departmentKeyStr;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let departmentIdField;
  const dkRaw = typeof body.departmentKey === "string" ? body.departmentKey.trim() : "";
  if (dkRaw && dkRaw !== "—") {
    const depDoc = await Department.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(/** @type {Record<string, unknown>} */ (scope), { key: dkRaw })
      ),
    )
      .select("_id key")
      .lean();
    if (depDoc?.key != null && depDoc._id) {
      departmentKeyStr = String(depDoc.key);
      departmentIdField = /** @type {mongoose.Types.ObjectId} */ (depDoc._id);
    }
  }

  if (!departmentKeyStr && tplDoc && typeof tplDoc.departmentKey === "string") {
    const dkT = tplDoc.departmentKey.trim();
    if (dkT && dkT !== "—") {
      const depDoc = await Department.findOne(
        /** @type {Record<string, unknown>} */ (
          andQuery(/** @type {Record<string, unknown>} */ (scope), { key: dkT }),
        ),
      )
        .select("_id key")
        .lean();
      if (depDoc?.key != null && depDoc._id) {
        departmentKeyStr = String(depDoc.key);
        departmentIdField = /** @type {mongoose.Types.ObjectId} */ (depDoc._id);
      }
    }
  }

  /** @type {string | undefined} */
  let assigneeKeyStr;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let assigneeIdField;
  /** @type {string[]} */
  let assigneeKeysResolved = [];

  const assigneeResolved = await resolveAssigneeMemberKeysFromBody(body, scope);
  assigneeKeysResolved = assigneeResolved.keys;
  if (assigneeKeysResolved.length) {
    assigneeKeyStr = assigneeKeysResolved[0];
    assigneeIdField = assigneeResolved.memberIds[0];
  }

  if (!assigneeKeysResolved.length && tplDoc != null) {
    const tplKeys = Array.isArray(tplDoc.assigneeMemberKeys) ?
      tplDoc.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
    : [];
    if (tplKeys.length) {
      const fromTpl = await resolveAssigneeMemberKeysFromBody({ assigneeMemberKeys: tplKeys }, scope);
      assigneeKeysResolved = fromTpl.keys;
      if (assigneeKeysResolved.length) {
        assigneeKeyStr = assigneeKeysResolved[0];
        assigneeIdField = fromTpl.memberIds[0];
      }
    }
  }

  const isoDue = typeof body.dueDate === "string" && body.dueDate.trim() ? body.dueDate.trim().slice(0, 10) : "";
  /** @type {Date | undefined} */
  let dueDateObj;
  if (isoDue) {
    const d = new Date(`${isoDue}T12:00:00`);
    if (!Number.isNaN(d.getTime())) dueDateObj = d;
  }

  if (!dueDateObj && tplDoc != null) {
    const dod = tplDoc.defaultDueOffsetDays;
    if (typeof dod === "number" && Number.isFinite(dod) && dod >= 0) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + dod);
      dueDateObj = d;
    }
  }

  /** @type {string} */
  const priority =
    parentDoc ?
      PRIOS.includes(/** @type {any} */ (String(parentDoc.priority ?? ""))) ?
        /** @type {any} */ (String(parentDoc.priority))
      : "medium"
    : PRIOS.includes(/** @type {any} */ (body.priority)) ? /** @type {any} */ (body.priority) : "medium";

  /** @type {string} */
  const statusRaw = TASK_UI_STATUSES.includes(/** @type {any} */ (String(body.status))) ? String(body.status) : "todo";

  /** @type {string} */
  let hintFinal = typeof body.hint === "string" ? body.hint : "";
  if (!hintFinal.trim() && tplDoc != null && typeof tplDoc.description === "string") {
    const hd = tplDoc.description.trim();
    if (hd) hintFinal = hd;
  }

  const descriptionRaw = typeof body.description === "string" ? body.description : "";
  const descriptionFinal = descriptionRaw.trim() ? sanitizeCommentHtml(descriptionRaw) : "";

  /** @type {Record<string, unknown>} */
  const doc = /** @type {any} */ ({
    title,
    hint: hintFinal,
    description: descriptionFinal,
    clientId: clientDocObj._id,
    clientSlug: clientDocObj.slug ?? undefined,
    departmentKey: departmentKeyStr,
    departmentId: departmentIdField,
    assigneeMemberKeys: assigneeKeysResolved,
    assigneeMemberKey: assigneeKeyStr,
    assigneeId: assigneeIdField,
    dueDate: dueDateObj,
    priority,
    status: statusRaw,
    billable:
      "billable" in body ? body.billable !== false
      : tplDoc != null ? tplDoc.billable !== false
      : true,
  });

  if (tplDoc?._id) {
    doc.templateId = tplDoc._id;
  }

  if (parentDoc?._id) {
    doc.isSubTask = true;
    doc.parentTaskId = parentDoc._id;
    doc.clientId = parentDoc.clientId;
    doc.clientSlug = parentDoc.clientSlug ?? clientDocObj.slug ?? undefined;
    doc.priority = priority;
  }

  if (typeof body.estimateHours === "number" && Number.isFinite(body.estimateHours)) {
    doc.estimateHours = body.estimateHours;
  } else if (
    tplDoc != null &&
    typeof tplDoc.suggestedHours === "number" &&
    Number.isFinite(tplDoc.suggestedHours)
  ) {
    doc.estimateHours = tplDoc.suggestedHours;
  }

  const actor = session ? await resolveTaskActorFromSession(session) : null;
  if (actor?.userId) {
    doc.createdByUserId = actor.userId;
    if (actor.memberKey) {
      doc.createdByMemberKey = actor.memberKey;
      if (actor.memberId) doc.createdByMemberId = actor.memberId;
    }
  }

  try {
    const created = await Task.create(doc);
    const refreshed = await Task.findById(created._id).lean();
    if (!refreshed || !clientDocObj) return { error: "Kunne ikke oprette opgaven", status: 500 };
    /** @type {Record<string, unknown>} */
    const cd = /** @type {Record<string, unknown>} */ (clientDocObj);

    const taskIdStr = created._id != null ? String(created._id) : "";
    if (actor?.userId && taskIdStr) {
      for (const key of assigneeKeysResolved) {
        await notifyTaskAssigned({
          taskId: taskIdStr,
          taskTitle: title,
          assigneeMemberKey: key,
          actor,
          scope: /** @type {Record<string, unknown>} */ (scope),
          isTest: includeTest,
        });
      }
    }

    return {
      ok: true,
      wire: buildTaskWireRow(refreshed, cd, {
        parentTitle: parentDoc && typeof parentDoc.title === "string" ? parentDoc.title : "",
        parentPriority: priority,
        parentClientDoc: parentDoc ? cd : null,
      }),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Databasefejl";
    return { error: msg, status: 500 };
  }
}

/**
 * @param {Record<string, unknown>} patch
 * @param {{ existing: Record<string, unknown>; scope: Record<string, unknown> }} ctx
 */
async function applyDeptAssigneePatches(patch, ctx) {
  /** @type {Record<string, unknown>} */
  const $set = /** @type {Record<string, unknown>} */ ({});
  /** @type {Record<string, number>} */
  const $unset = /** @type {Record<string, number>} */ ({});

  const isSubTask = ctx.existing.isSubTask === true;

  if (typeof patch.title === "string" && patch.title.trim()) {
    $set.title = patch.title.trim();
  }
  if (typeof patch.hint === "string") {
    $set.hint = patch.hint;
  }
  if (typeof patch.description === "string") {
    $set.description = patch.description.trim() ? sanitizeCommentHtml(patch.description) : "";
  }
  if (!isSubTask && typeof patch.priority === "string" && PRIOS.includes(/** @type {any} */ (patch.priority))) {
    $set.priority = patch.priority;
  }
  if (typeof patch.status === "string") {
    $set.status = sanitizeTaskUiStatus(patch.status);
  }

  if (patch.dueDate === null || patch.dueDate === "") {
    $unset.dueDate = 1;
  } else   if (typeof patch.dueDate === "string") {
    const trimmed = patch.dueDate.trim();
    if (!trimmed) $unset.dueDate = 1;
    else {
      const d = new Date(`${trimmed.slice(0, 10)}T12:00:00`);
      if (!Number.isNaN(d.getTime())) $set.dueDate = d;
    }
  }

  if (patch.scheduledStart === null || patch.scheduledStart === "") {
    $unset.scheduledStart = 1;
  } else if (typeof patch.scheduledStart === "string" && patch.scheduledStart.trim()) {
    const d = new Date(patch.scheduledStart.trim());
    if (!Number.isNaN(d.getTime())) $set.scheduledStart = d;
  }

  if (patch.scheduledEnd === null || patch.scheduledEnd === "") {
    $unset.scheduledEnd = 1;
  } else if (typeof patch.scheduledEnd === "string" && patch.scheduledEnd.trim()) {
    const d = new Date(patch.scheduledEnd.trim());
    if (!Number.isNaN(d.getTime())) $set.scheduledEnd = d;
  }

  if ("estimateHours" in patch) {
    if (patch.estimateHours === null || patch.estimateHours === "") {
      $unset.estimateHours = 1;
    } else if (typeof patch.estimateHours === "number" && Number.isFinite(patch.estimateHours) && patch.estimateHours >= 0) {
      $set.estimateHours = patch.estimateHours;
    }
  }

  if ("billable" in patch) {
    $set.billable = patch.billable !== false;
  }

  if ("departmentKey" in patch) {
    const raw = patch.departmentKey;
    const k = typeof raw === "string" ? raw.trim() : "";
    if (!k || k === "—") {
      $unset.departmentKey = 1;
      $unset.departmentId = 1;
    } else {
      const depDoc = await Department.findOne(
        /** @type {Record<string, unknown>} */ (
          andQuery(/** @type {Record<string, unknown>} */ (ctx.scope), { key: k })
        ),
      )
        .select("_id key")
        .lean();
      if (depDoc?.key != null && depDoc._id) {
        $set.departmentKey = String(depDoc.key);
        $set.departmentId = depDoc._id;
      }
    }
  }

  if ("assigneeMemberKeys" in patch || "assigneeMemberKey" in patch) {
    const resolved = await resolveAssigneeMemberKeysFromBody(patch, ctx.scope);
    if (!resolved.keys.length) {
      $unset.assigneeMemberKey = 1;
      $unset.assigneeId = 1;
      $set.assigneeMemberKeys = [];
    } else {
      $set.assigneeMemberKeys = resolved.keys;
      $set.assigneeMemberKey = resolved.keys[0];
      $set.assigneeId = resolved.memberIds[0];
    }
  }

  let clientOid =
    typeof ctx.existing.clientId !== "undefined" && ctx.existing.clientId != null ?
      ctx.existing.clientId
    : null;

  if (!isSubTask && (patch.clientSlug != null || patch.clientId != null)) {
    const body = {
      clientSlug: typeof patch.clientSlug === "string" ? patch.clientSlug : "",
      clientId: typeof patch.clientId === "string" ? patch.clientId : "",
    };
    const nextClient = await findClientForMutation(body, ctx.scope);
    if (!nextClient) return { error: "Kunde ikke fundet", status: 400 };

    $set.clientId = nextClient._id;
    $set.clientSlug = nextClient.slug;
    clientOid = nextClient._id;
  }

  return { ok: /** @type {const} */ (true), $set, $unset, clientOid, isSubTask };
}

/**
 * @param {string} taskKeyOrId
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} patch
 * @param {import('next-auth').Session | null} [session]
 */
export async function updateTaskMongo(taskKeyOrId, includeTest, patch, session = null) {
  const id = taskKeyOrId.trim();
  if (!id) return { error: "Mangler opgave-id", status: 400 };

  await connectDb();
  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orConditions = [];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(id) });
  } else {
    return { error: "Ugyldigt opgave-id", status: 400 };
  }

  const existingRaw = await Task.findOne(andQuery(scope, /** @type {Record<string, unknown>} */ ({ $or: orConditions })))
    .lean();
  const existing = existingRaw != null ? /** @type {Record<string, unknown>} */ (existingRaw) : null;
  if (!existing) return { error: "Ikke fundet", status: 404 };

  const prevAssignees = normalizeAssigneeMemberKeysFromDoc(existing);

  const applied = await applyDeptAssigneePatches(patch, { existing, scope });
  if ("error" in applied) return applied;

  /** @type {Record<string, unknown>} */
  const updateDoc = {};

  if (Object.keys(applied.$unset).length) {
    updateDoc.$unset = applied.$unset;
  }

  if (Object.keys(applied.$set).length) {
    updateDoc.$set = applied.$set;
  }

  if (!updateDoc.$set && !updateDoc.$unset) {
    return { error: "Ingen felter opdateret", status: 400 };
  }

  await Task.updateOne({ _id: existing._id }, updateDoc).exec();

  const fresh = await Task.findById(existing._id).lean();
  if (!fresh || applied.clientOid == null) return { error: "Opdateringsfejl", status: 500 };

  const clientChanged = "clientId" in applied.$set || "clientSlug" in applied.$set;
  const priorityChanged = "priority" in applied.$set;
  const isParent = fresh.isSubTask !== true;
  if (isParent && (clientChanged || priorityChanged)) {
    /** @type {Record<string, unknown>} */
    const subPatch = {};
    if (clientChanged) {
      subPatch.clientId = applied.$set.clientId;
      subPatch.clientSlug = applied.$set.clientSlug;
    }
    if (priorityChanged) subPatch.priority = applied.$set.priority;
    await Task.updateMany(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ parentTaskId: existing._id, isSubTask: true }))
      ),
      { $set: subPatch },
    ).exec();
  }

  const clientDocFresh = await Client.findById(applied.clientOid).lean();

  if (!clientDocFresh) return { error: "Kunde ikke fundet efter patch", status: 500 };

  const taskIdStr = existing._id != null ? String(existing._id) : "";
  const newAssignees = normalizeAssigneeMemberKeysFromDoc(fresh);
  const taskTitle = typeof fresh.title === "string" ? fresh.title : "Opgave";

  if (session && taskIdStr) {
    const actor = await resolveTaskActorFromSession(session);
    if (actor.userId) {
      const added = newAssignees.filter((k) => !prevAssignees.includes(k));
      for (const key of added) {
        await notifyTaskAssigned({
          taskId: taskIdStr,
          taskTitle,
          assigneeMemberKey: key,
          actor,
          scope: /** @type {Record<string, unknown>} */ (scope),
          isTest: includeTest,
        });
      }
    }
  }

  return {
    ok: /** @type {const} */ (true),

    wire: buildTaskWireRow(
      fresh,
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (clientDocFresh)),
    ),
  };
}

/**
 * @param {string} taskKeyOrId
 * @param {boolean} includeTest
 */
export async function deleteTaskMongo(taskKeyOrId, includeTest) {
  const id = taskKeyOrId.trim();
  if (!id) return { error: "Mangler id", status: 400 };

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Ugyldigt opgave-id", status: 400 };
  }

  const oid = new mongoose.Types.ObjectId(id);
  const existing = await Task.findOne(
    /** @type {Record<string, unknown>} */ (andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: oid }))),
  )
    .select("_id isSubTask parentTaskId")
    .lean();

  if (!existing?._id) return { error: "Ikke fundet", status: 404 };

  if (existing.isSubTask !== true) {
    await Task.deleteMany(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ parentTaskId: existing._id, isSubTask: true }))
      ),
    ).exec();
  }

  const res = await Task.deleteOne(
    /** @type {Record<string, unknown>} */ (andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: oid }))),
  ).exec();
  if ((res?.deletedCount ?? 0) < 1) return { error: "Ikke fundet", status: 404 };
  return { ok: /** @type {const} */ (true) };
}

/**
 * @param {{ taskKeyOrId: string; includeTest?: boolean; year?: number; month?: number; expectedParentTaskId?: string }} opts
 */
export async function fetchTaskDetailBundle(opts) {
  const includeTest = Boolean(opts.includeTest);
  const lookup = String(opts.taskKeyOrId || "").trim();
  if (!lookup) return { error: "Mangler id", status: 400 };

  const expectedParent = typeof opts.expectedParentTaskId === "string" ? opts.expectedParentTaskId.trim() : "";

  const { year, month } = normalizeReportPeriod(opts);
  const periodLabel = formatReportPeriodLabel(year, month);
  const dueRefIso = taskDueReferenceTodayIso();

  await connectDb();
  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orConditions = [];
  if (mongoose.Types.ObjectId.isValid(lookup)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(lookup) });
  } else {
    return { error: "Ugyldigt opgave-id", status: 400 };
  }

  const tdRaw = await Task.findOne(andQuery(scope, /** @type {Record<string, unknown>} */ ({ $or: orConditions }))).lean();
  /** @type {Record<string, unknown> | null} */
  const td = tdRaw && typeof tdRaw === "object" ? /** @type {Record<string, unknown>} */ (tdRaw) : null;
  if (!td?.clientId) return { error: "Ikke fundet", status: 404 };

  if (expectedParent) {
    const actualParent = td.parentTaskId != null ? String(td.parentTaskId) : "";
    if (td.isSubTask !== true || actualParent !== expectedParent) {
      return { error: "Delopgave matcher ikke hovedopgaven", status: 404 };
    }
  }

  /** @type {Record<string, unknown>} */
  const taskDocObj = td;

  /** @type {Record<string, unknown> | null} */
  let parentDocObj = null;
  /** @type {Record<string, unknown> | null} */
  let parentClientDocObj = null;
  if (td.isSubTask === true && td.parentTaskId) {
    const parentRaw = await Task.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: td.parentTaskId }))
      ),
    ).lean();
    parentDocObj = parentRaw != null ? /** @type {Record<string, unknown>} */ (parentRaw) : null;
    if (parentDocObj?.clientId) {
      const pcRaw = await Client.findOne(
        /** @type {Record<string, unknown>} */ (
          andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: parentDocObj.clientId }))
        ),
      ).lean();
      parentClientDocObj = pcRaw != null ? /** @type {Record<string, unknown>} */ (pcRaw) : null;
    }
  }

  const clientRaw = await Client.findOne(
    andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: td.clientId })),
  ).lean();

  /** @type {Record<string, unknown> | null} */
  const clientDocObj =
    (parentClientDocObj ?? (clientRaw && typeof clientRaw === "object" ? /** @type {Record<string, unknown>} */ (clientRaw) : null));
  if (!clientDocObj) return { error: "Kunde ikke fundet", status: 404 };

  const taskRow = buildTaskWireRow(taskDocObj, clientDocObj, {
    parentTitle: parentDocObj && typeof parentDocObj.title === "string" ? parentDocObj.title : "",
    parentPriority:
      parentDocObj && typeof parentDocObj.priority === "string" ? parentDocObj.priority : undefined,
    parentClientDoc: parentClientDocObj,
  });
  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);
  const clientOid = String(clientDocObj._id ?? "");
  const taskOidStr =
    typeof taskDocObj._id !== "undefined" && taskDocObj._id != null ? String(taskDocObj._id) : "";

  const taskEntryOr = [
    ...(taskOidStr && mongoose.Types.ObjectId.isValid(taskOidStr) ?
      [{ taskId: new mongoose.Types.ObjectId(taskOidStr) }]
    : []),
    ...(taskRow.id ? [{ taskKey: taskRow.id }] : []),
  ];

  const [monthEntriesRaw, taskEntriesRaw, ctrDocsRaw, depMetaRaw, teamMetaRaw, pickRaw] = await Promise.all([
    TimeEntry.find({
      clientId: clientDocObj._id,
      workedAt: { $gte: monthStart, $lt: monthEnd },
      billable: { $ne: false },
    })
      .sort({ workedAt: -1 })
      .limit(120)
      .lean(),
    taskEntryOr.length ?
      TimeEntry.find(andQuery(scope, /** @type {Record<string, unknown>} */ ({ $or: taskEntryOr })))
        .sort({ workedAt: -1 })
        .limit(200)
        .lean()
    : [],
    Contract.find(andQuery(scope, /** @type {Record<string, unknown>} */ ({ clientId: clientDocObj._id })))
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean(),
    Department.find(/** @type {Record<string, unknown>} */ (scope)).sort({ name: 1 }).lean(),
    TeamMember.find(/** @type {Record<string, unknown>} */ ({ ...scope, active: { $ne: false } }))
      .sort({ name: 1 })
      .lean(),
    Client.find(/** @type {Record<string, unknown>} */ (scope)).select("slug name").sort({ name: 1 }).lean(),
  ]);

  const monthEntries = Array.isArray(monthEntriesRaw) ? monthEntriesRaw : [];

  let billableHoursClient = 0;
  for (const e of monthEntries) {
    billableHoursClient += (Number(e.durationMinutes) || 0) / 60;
  }
  const hoursRounded = Math.round(billableHoursClient * 10) / 10;
  const pulseBase = mapClientForPulse(
    clientDocObj,
    /** @type {Record<string, number>} */ ({ [clientOid]: hoursRounded }),
  );

  const slug =
    typeof clientDocObj.slug === "string" && clientDocObj.slug.trim()
      ? clientDocObj.slug.trim()
      : clientOid;

  const teamMetaDocs = Array.isArray(teamMetaRaw) ? teamMetaRaw : [];
  /** @type {Record<string, string>} */
  const memberNameByKey = {};
  for (const m of teamMetaDocs) {
    const key = typeof m.key === "string" ? m.key.trim() : "";
    if (key) memberNameByKey[key] = typeof m.name === "string" ? m.name : key;
  }

  /** @type {{ id: string; at: string; dur: number; desc: string; dept?: string; memberKey?: string; memberName?: string }[]} */
  const timeEntriesMapped = [];
  const taskEntries = Array.isArray(taskEntriesRaw) ? taskEntriesRaw : [];
  for (const e of taskEntries) {
    const worked = e.workedAt ? new Date(String(e.workedAt)) : null;
    if (!worked || Number.isNaN(worked.getTime())) continue;
    const hh = `${String(worked.getHours()).padStart(2, "0")}:${String(worked.getMinutes()).padStart(2, "0")}`;
    const day = `${String(worked.getDate()).padStart(2, "0")}.${String(worked.getMonth() + 1).padStart(2, "0")}.${worked.getFullYear()}`;
    const mk = typeof e.memberKey === "string" ? e.memberKey.trim() : "";
    timeEntriesMapped.push({
      id: e._id != null ? String(e._id) : `${day}-${timeEntriesMapped.length}`,
      at: `${day} kl. ${hh}`,
      dur: Number(e.durationMinutes) || 0,
      desc: typeof e.description === "string" ? e.description : "",
      dept: typeof e.departmentKey === "string" ? String(e.departmentKey) : undefined,
      ...(mk ? { memberKey: mk, memberName: memberNameByKey[mk] ?? mk } : {}),
    });
  }

  const cds = Array.isArray(ctrDocsRaw) ? ctrDocsRaw : [];
  const detailClient = enrichClientRetainer(
    {
      ...pulseBase,
      id: slug,
      startedAt: contractToIsoDateOnly(clientDocObj.startedAt) || "",
      renewalAt: contractToIsoDateOnly(clientDocObj.renewalAt) || "",
    },
    sumContributingContractRetainer(/** @type {Record<string, unknown>[]} */ (cds)),
  );
  /** @type {Record<string, unknown> | null} */
  let primaryCtr =
    /** @type {Record<string, unknown> | undefined} */ (cds.find((c) => ["active", "notice"].includes(String(c.status))));
  if (!primaryCtr && cds[0]) primaryCtr = /** @type {Record<string, unknown>} */ (cds[0]);
  const contractWire =
    primaryCtr && typeof primaryCtr === "object" ? buildContractWireRow(primaryCtr, clientDocObj) : null;

  /** @type {Awaited<ReturnType<typeof mapTeamMemberFromMongo>> | null} */
  let assigneePulse = null;
  const ak = typeof td.assigneeMemberKey === "string" ? td.assigneeMemberKey.trim() : "";
  if (ak) {
    const memRaw = await TeamMember.findOne(andQuery(scope, /** @type {Record<string, unknown>} */ ({ key: ak }))).lean();
    if (memRaw && typeof memRaw === "object") {
      const memRec = /** @type {Record<string, unknown>} */ (memRaw);
      const userImage =
        memRec.userId != null ? await userImageByUserId(String(memRec.userId)) : null;
      assigneePulse = mapTeamMemberFromMongo(userImage ? { ...memRec, image: userImage } : memRec);
    }
  }

  /** @type {Awaited<ReturnType<typeof mapTeamMemberFromMongo>> | null} */
  let createdByPulse = null;
  const cbk = typeof td.createdByMemberKey === "string" ? td.createdByMemberKey.trim() : "";
  if (cbk) {
    const memRaw = await TeamMember.findOne(andQuery(scope, /** @type {Record<string, unknown>} */ ({ key: cbk }))).lean();
    if (memRaw && typeof memRaw === "object") {
      const memRec = /** @type {Record<string, unknown>} */ (memRaw);
      const userImage =
        memRec.userId != null ? await userImageByUserId(String(memRec.userId)) : null;
      createdByPulse = mapTeamMemberFromMongo(userImage ? { ...memRec, image: userImage } : memRec);
    }
  }

  const createdIso = contractToIsoDateOnly(td.createdAt) || "";
  const updatedIso = contractToIsoDateOnly(td.updatedAt) || "";

  /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */
  const activityEntries = [];
  if (createdIso) {
    activityEntries.push({
      id: `${taskRow.id}-c`,
      at: createdIso,
      kind: "Timeline",
      summary: "Opgave registreret i CRM.",
    });
  }
  if (updatedIso && updatedIso !== createdIso) {
    activityEntries.push({
      id: `${taskRow.id}-u`,
      at: updatedIso,
      kind: "Opdatering",
      summary: "Seneste ændring ifølge CRM (groft tidsstempel).",
    });
  }

  const departments = (Array.isArray(depMetaRaw) ? depMetaRaw : []).map(mapDepartmentTaskRow);
  const teamMetaEnriched = await enrichMembersWithUserImages(teamMetaDocs);
  const team = teamMetaEnriched.map(mapTeamMemberFromMongo);
  const clientsPicklist = (Array.isArray(pickRaw) ? pickRaw : []).map((d) => ({
    value: String(d.slug ?? ""),
    label: String(d.name ?? d.slug ?? "—"),
  }));

  /** @type {ReturnType<typeof buildTaskWireRow>[]} */
  let subTasks = [];
  /** @type {ReturnType<typeof buildTaskWireRow> | null} */
  let parentTask = null;

  if (td.isSubTask !== true) {
    const subDocsRaw = await Task.find(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, /** @type {Record<string, unknown>} */ ({ parentTaskId: td._id, isSubTask: true }))
      ),
    )
      .sort({ dueDate: 1, title: 1 })
      .lean();
    const subDocs = Array.isArray(subDocsRaw) ? subDocsRaw : [];
    subTasks = subDocs
      .map((sub) => {
        const subRec = /** @type {Record<string, unknown>} */ (sub);
        return buildTaskWireRow(subRec, clientDocObj, {
          parentTitle: taskRow.title,
          parentPriority: taskRow.priority,
          parentClientDoc: clientDocObj,
        });
      })
      .filter(Boolean);
  } else if (parentDocObj && parentClientDocObj) {
    parentTask = buildTaskWireRow(parentDocObj, parentClientDocObj);
  }

  return {
    source: /** @type {const} */ ("database"),
    period: {
      year,
      month,
      label: periodLabel,
      isCurrent: isCurrentReportPeriod(year, month),
    },
    taskDueReferenceIso: dueRefIso,
    overdueRefIso: dueRefIso,
    task: taskRow,
    parentTask,
    subTasks,
    client: detailClient,
    contract: contractWire,
    assignee: assigneePulse,
    createdBy: createdByPulse,
    alerts: alertsForOneClient(
      /** @type {import('@/lib/crm/pulse-types').PulseClient} */ (/** @type {unknown} */ (pulseBase)),
    ),
    activityEntries,
    timeEntriesMapped,
    departments,
    team,
    clientsPicklist,
  };
}

