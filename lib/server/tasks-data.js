import mongoose from "mongoose";

import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
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
import { sanitizeTaskUiStatus, TASK_UI_STATUSES } from "@/lib/crm/task-utils";
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

/**
 * @param {Record<string, unknown>} taskDoc
 * @param {Record<string, unknown>} clientDoc
 */
export function buildTaskWireRow(taskDoc, clientDoc) {
  const slug = String(clientDoc.slug ?? clientDoc._id);
  const oid = typeof taskDoc._id !== "undefined" && taskDoc._id !== null ? String(taskDoc._id) : "";

  const id = oid;

  const logo = String(clientDoc.logoInitials ?? "?");
  let st = String(taskDoc.status ?? "todo");
  if (!TASK_UI_STATUSES.includes(/** @type {any} */ (st))) st = "todo";

  /** @type {(typeof TASK_UI_STATUSES)[number]} */
  const status = /** @type {any} */ (st);

  let prio = String(taskDoc.priority ?? "medium");
  if (!PRIOS.includes(/** @type {any} */ (prio))) prio = "medium";
  /** @type {(typeof PRIOS)[number]} */
  const priority = /** @type {any} */ (prio);

  return {
    id,
    mongoId: oid,
    title: String(taskDoc.title ?? "—"),
    hint: typeof taskDoc.hint === "string" ? taskDoc.hint : "",
    clientId: slug,
    clientName: String(clientDoc.name ?? "—"),
    clientLogo: (String(logo ?? "?").trim().slice(0, 2).toUpperCase() || "?").slice(0, 2),
    clientHue: typeof clientDoc.hue === "number" ? clientDoc.hue : 220,
    assigneeId: String(taskDoc.assigneeMemberKey ?? ""),
    dept: String(taskDoc.departmentKey ?? "").trim() || "—",
    status,
    priority,
    dueDate: contractToIsoDateOnly(taskDoc.dueDate) || "",
    estimateHours:
      typeof taskDoc.estimateHours === "number" && Number.isFinite(taskDoc.estimateHours)
        ? taskDoc.estimateHours
        : null,
    loggedHours:
      typeof taskDoc.loggedHours === "number" && Number.isFinite(taskDoc.loggedHours) ? taskDoc.loggedHours : 0,
    createdAt: contractToIsoDateOnly(taskDoc.createdAt) || "",
    updatedAt: contractToIsoDateOnly(taskDoc.updatedAt) || "",
  };
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
  const overdueRefIso = lastCalendarDayIsoOfReportMonth(year, month);
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
  const tasks = [];
  for (const td of taskDocs) {
    const cid = String(td.clientId);
    const cd = merged[cid];
    if (!cd) continue;
    tasks.push(buildTaskWireRow(td, cd));
  }

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
    };
  });

  const openCount = tasks.filter((t) => !TASK_TERMINAL_STATUSES.includes(t.status)).length;
  const overdueCount = tasks.filter(
    (t) =>
      !TASK_TERMINAL_STATUSES.includes(t.status) &&
      Boolean(t.dueDate && String(t.dueDate) < overdueRefIso),
  ).length;
  const mineCount = mineKey ? tasks.filter((t) => t.assigneeId === mineKey).length : 0;
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

/** @param {Record<string, unknown>} body */
export async function createTaskMongo(body, includeTest) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "Titel mangler", status: 400 };

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  const clientDocObj = await findClientForMutation(body, /** @type {Record<string, unknown>} */ (scope));
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
  const akRaw = typeof body.assigneeMemberKey === "string" ? body.assigneeMemberKey.trim() : "";
  if (akRaw) {
    const memDoc = await TeamMember.findOne(
      /** @type {Record<string, unknown>} */ (andQuery(/** @type {Record<string, unknown>} */ (scope), { key: akRaw })),
    )
      .select("_id key")
      .lean();
    if (memDoc?.key != null && memDoc._id) {
      assigneeKeyStr = String(memDoc.key);
      assigneeIdField = /** @type {mongoose.Types.ObjectId} */ (memDoc._id);
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
  const priority = PRIOS.includes(/** @type {any} */ (body.priority)) ? /** @type {any} */ (body.priority) : "medium";

  /** @type {string} */
  const statusRaw = TASK_UI_STATUSES.includes(/** @type {any} */ (String(body.status))) ? String(body.status) : "todo";

  /** @type {string} */
  let hintFinal = typeof body.hint === "string" ? body.hint : "";
  if (!hintFinal.trim() && tplDoc != null && typeof tplDoc.description === "string") {
    const hd = tplDoc.description.trim();
    if (hd) hintFinal = hd;
  }

  /** @type {Record<string, unknown>} */
  const doc = /** @type {any} */ ({
    title,
    hint: hintFinal,
    clientId: clientDocObj._id,
    clientSlug: clientDocObj.slug ?? undefined,
    departmentKey: departmentKeyStr,
    departmentId: departmentIdField,
    assigneeMemberKey: assigneeKeyStr,
    assigneeId: assigneeIdField,
    dueDate: dueDateObj,
    priority,
    status: statusRaw,
  });

  if (tplDoc?._id) {
    doc.templateId = tplDoc._id;
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

  try {
    const created = await Task.create(doc);
    const refreshed = await Task.findById(created._id).lean();
    if (!refreshed || !clientDocObj) return { error: "Kunne ikke oprette opgaven", status: 500 };
    /** @type {Record<string, unknown>} */
    const cd = /** @type {Record<string, unknown>} */ (clientDocObj);
    return { ok: true, wire: buildTaskWireRow(refreshed, cd) };
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

  if (typeof patch.title === "string" && patch.title.trim()) {
    $set.title = patch.title.trim();
  }
  if (typeof patch.hint === "string") {
    $set.hint = patch.hint;
  }
  if (typeof patch.priority === "string" && PRIOS.includes(/** @type {any} */ (patch.priority))) {
    $set.priority = patch.priority;
  }
  if (typeof patch.status === "string") {
    $set.status = sanitizeTaskUiStatus(patch.status);
  }

  if (patch.dueDate === null || patch.dueDate === "") {
    $unset.dueDate = 1;
  } else if (typeof patch.dueDate === "string") {
    const trimmed = patch.dueDate.trim();
    if (!trimmed) $unset.dueDate = 1;
    else {
      const d = new Date(`${trimmed.slice(0, 10)}T12:00:00`);
      if (!Number.isNaN(d.getTime())) $set.dueDate = d;
    }
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

  if ("assigneeMemberKey" in patch) {
    const raw = patch.assigneeMemberKey;
    const k = typeof raw === "string" ? raw.trim() : "";
    if (!k) {
      $unset.assigneeMemberKey = 1;
      $unset.assigneeId = 1;
    } else {
      const memDoc = await TeamMember.findOne(
        /** @type {Record<string, unknown>} */ (andQuery(/** @type {Record<string, unknown>} */ (ctx.scope), { key: k })),
      )
        .select("_id key")
        .lean();
      if (memDoc?.key != null && memDoc._id) {
        $set.assigneeMemberKey = String(memDoc.key);
        $set.assigneeId = memDoc._id;
      }
    }
  }

  let clientOid =
    typeof ctx.existing.clientId !== "undefined" && ctx.existing.clientId != null ?
      ctx.existing.clientId
    : null;

  if (patch.clientSlug != null || patch.clientId != null) {
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

  return { ok: /** @type {const} */ (true), $set, $unset, clientOid };
}

/**
 * @param {string} taskKeyOrId
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} patch
 */
export async function updateTaskMongo(taskKeyOrId, includeTest, patch) {
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

  const clientDocFresh = await Client.findById(applied.clientOid).lean();

  if (!clientDocFresh) return { error: "Kunde ikke fundet efter patch", status: 500 };

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

  const res = await Task.deleteOne(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(id) }))
    ),
  ).exec();
  if ((res?.deletedCount ?? 0) < 1) return { error: "Ikke fundet", status: 404 };
  return { ok: /** @type {const} */ (true) };
}

/**
 * @param {{ taskKeyOrId: string; includeTest?: boolean; year?: number; month?: number }} opts
 */
export async function fetchTaskDetailBundle(opts) {
  const includeTest = Boolean(opts.includeTest);
  const lookup = String(opts.taskKeyOrId || "").trim();
  if (!lookup) return { error: "Mangler id", status: 400 };

  const { year, month } = normalizeReportPeriod(opts);
  const periodLabel = formatReportPeriodLabel(year, month);
  const dueRefIso = lastCalendarDayIsoOfReportMonth(year, month);

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

  /** @type {Record<string, unknown>} */
  const taskDocObj = td;

  const clientRaw = await Client.findOne(
    andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: td.clientId })),
  ).lean();

  /** @type {Record<string, unknown> | null} */
  const clientDocObj =
    clientRaw && typeof clientRaw === "object" ? /** @type {Record<string, unknown>} */ (clientRaw) : null;
  if (!clientDocObj) return { error: "Kunde ikke fundet", status: 404 };

  const taskRow = buildTaskWireRow(taskDocObj, clientDocObj);
  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);
  const clientOid = String(clientDocObj._id ?? "");
  const taskOidStr =
    typeof taskDocObj._id !== "undefined" && taskDocObj._id != null ? String(taskDocObj._id) : "";

  const [monthEntriesRaw, ctrDocsRaw, depMetaRaw, teamMetaRaw, pickRaw] = await Promise.all([
    TimeEntry.find({
      clientId: clientDocObj._id,
      workedAt: { $gte: monthStart, $lt: monthEnd },
      billable: { $ne: false },
    })
      .sort({ workedAt: -1 })
      .limit(120)
      .lean(),
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

  const detailClient = {
    ...pulseBase,
    id: slug,
    startedAt: contractToIsoDateOnly(clientDocObj.startedAt) || "",
    renewalAt: contractToIsoDateOnly(clientDocObj.renewalAt) || "",
  };

  /**
   * @param {Record<string, unknown>} e
   * @returns {boolean}
   */
  function entryMatchesTask(e) {
    if (taskOidStr && e.taskId && String(e.taskId) === taskOidStr) return true;
    const ek = typeof e.taskKey === "string" ? e.taskKey.trim() : "";
    return Boolean(ek && ek === taskRow.id);
  }

  /** @type {{ id: string; at: string; dur: number; desc: string; dept?: string }[]} */
  const timeEntriesMapped = [];
  for (const e of monthEntries) {
    if (!entryMatchesTask(e)) continue;
    const worked = e.workedAt ? new Date(String(e.workedAt)) : null;
    if (!worked || Number.isNaN(worked.getTime())) continue;
    const hh = `${String(worked.getHours()).padStart(2, "0")}:${String(worked.getMinutes()).padStart(2, "0")}`;
    const day = `${String(worked.getDate()).padStart(2, "0")}.${String(worked.getMonth() + 1).padStart(2, "0")}.${worked.getFullYear()}`;
    timeEntriesMapped.push({
      id: e._id != null ? String(e._id) : `${day}-${timeEntriesMapped.length}`,
      at: `${day} kl. ${hh}`,
      dur: Number(e.durationMinutes) || 0,
      desc: typeof e.description === "string" ? e.description : "",
      dept: typeof e.departmentKey === "string" ? String(e.departmentKey) : undefined,
    });
  }

  const cds = Array.isArray(ctrDocsRaw) ? ctrDocsRaw : [];
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
  const teamMetaDocs = Array.isArray(teamMetaRaw) ? teamMetaRaw : [];
  const teamMetaEnriched = await enrichMembersWithUserImages(teamMetaDocs);
  const team = teamMetaEnriched.map(mapTeamMemberFromMongo);
  const clientsPicklist = (Array.isArray(pickRaw) ? pickRaw : []).map((d) => ({
    value: String(d.slug ?? ""),
    label: String(d.name ?? d.slug ?? "—"),
  }));

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
    client: detailClient,
    contract: contractWire,
    assignee: assigneePulse,
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

