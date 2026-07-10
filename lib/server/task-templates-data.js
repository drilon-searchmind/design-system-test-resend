import mongoose from "mongoose";

import { slugifyStableKey } from "@/lib/crm/slug-key";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TaskTemplate from "@/lib/db/models/task-template";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import { contractToIsoDateOnly, mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { enrichMembersWithUserImages } from "@/lib/server/member-user-images";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { mapDepartmentTaskRow } from "@/lib/server/tasks-data";

const SCOPE_ENUM = /** @type {const} */ (["retainer", "project", "any"]);
const PRIOS = /** @type {const} */ (["high", "medium", "low"]);

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @param {Record<string, unknown>} doc */
function normalizeAssigneeMemberKeysFromDoc(doc) {
  const fromArray = Array.isArray(doc.assigneeMemberKeys) ?
    doc.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
  : [];
  return [...new Set(fromArray)];
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

  for (const key of rawKeys) {
    const memDoc = await TeamMember.findOne(andQuery(scope, { key })).select("key").lean();
    if (memDoc?.key != null) resolved.push(String(memDoc.key));
  }

  return resolved;
}

/**
 * @param {Record<string, unknown>} scope
 */
async function fetchTeamForTemplates(scope) {
  const teamRaw = await TeamMember.find(
    /** @type {Record<string, unknown>} */ ({ ...scope, active: { $ne: false } }),
  )
    .sort({ name: 1 })
    .lean();
  const teamEnriched = await enrichMembersWithUserImages(Array.isArray(teamRaw) ? teamRaw : []);
  return teamEnriched.map(mapTeamMemberFromMongo);
}

/**
 * @param {Record<string, unknown>} doc
 * @param {Map<string, number>} usedByTemplateId
 */
export function buildTaskTemplateWireRow(doc, usedByTemplateId) {
  const oid = typeof doc._id !== "undefined" && doc._id != null ? String(doc._id) : "";
  const keyTrim = typeof doc.key === "string" ? doc.key.trim() : "";
  const id = keyTrim || `tpl-${oid.slice(-8)}`;

  const used = oid ? (usedByTemplateId.get(oid) ?? 0) : 0;
  const assigneeMemberKeys = normalizeAssigneeMemberKeysFromDoc(doc);

  let prio = String(doc.defaultPriority ?? "medium");
  if (!PRIOS.includes(/** @type {any} */ (prio))) prio = "medium";

  let scope = String(doc.scope ?? "retainer");
  if (!SCOPE_ENUM.includes(/** @type {any} */ (scope))) scope = "retainer";

  return {
    id,
    mongoId: oid,
    name: String(doc.title ?? "—"),
    hint: typeof doc.description === "string" ? doc.description : "",
    dept: String(doc.departmentKey ?? "").trim() || "—",
    defaultPriority: /** @type {'high' | 'medium' | 'low'} */ (prio),
    defaultDueOffsetDays: typeof doc.defaultDueOffsetDays === "number" && Number.isFinite(doc.defaultDueOffsetDays) ? doc.defaultDueOffsetDays : 0,
    estHours:
      typeof doc.suggestedHours === "number" && Number.isFinite(doc.suggestedHours) ? doc.suggestedHours : 0,
    assigneeMemberKeys,
    billable: doc.billable !== false,
    scope: /** @type {'retainer' | 'project' | 'any'} */ (
      /** @type {unknown} */ (scope)
    ),
    active: doc.active !== false,
    updatedAt: contractToIsoDateOnly(doc.updatedAt) || contractToIsoDateOnly(doc.createdAt) || "",
    usedCount: used,
  };
}

/**
 * @param {{ includeTest?: boolean }} opts
 */
export async function fetchTemplatesPortfolio(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  await connectDb();

  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  const [docsRaw, depRaw, team] = await Promise.all([
    TaskTemplate.find(/** @type {Record<string, unknown>} */ (scope)).sort({ updatedAt: -1 }).lean(),
    Department.find(/** @type {Record<string, unknown>} */ (scope)).sort({ name: 1 }).lean(),
    fetchTeamForTemplates(scope),
  ]);

  const docs = Array.isArray(docsRaw) ? docsRaw : [];
  const oidList = docs.map((d) => d._id).filter(Boolean);

  /** @type {Map<string, number>} */
  const usedByTemplateId = new Map();
  if (oidList.length) {
    /** @type {Record<string, unknown>} */
    const taskMatch = /** @type {Record<string, unknown>} */ (
      andQuery(/** @type {Record<string, unknown>} */ (scope), {
        templateId: { $exists: true, $ne: null, $in: oidList },
      })
    );
    const agg = await Task.aggregate([{ $match: taskMatch }, { $group: { _id: "$templateId", n: { $sum: 1 } } }]);
    for (const row of agg) {
      if (row._id) usedByTemplateId.set(String(row._id), Number(row.n) || 0);
    }
  }

  const templates = docs.map((d) => buildTaskTemplateWireRow(/** @type {Record<string, unknown>} */ (d), usedByTemplateId));

  const departments = (Array.isArray(depRaw) ? depRaw : []).map(mapDepartmentTaskRow);
  const activeCount = templates.filter((t) => t.active).length;
  const deptsHit = new Set(templates.map((t) => (t.dept === "—" ? null : t.dept)).filter(Boolean)).size;
  const totalUsage = templates.reduce((s, t) => s + t.usedCount, 0);

  return {
    source: /** @type {const} */ ("database"),
    templates,
    departments,
    team,
    summary: {
      total: templates.length,
      activeCount,
      deptCoverageDen: Math.max(departments.length, 1),
      deptCoverageNum: deptsHit,
      totalUsage,
    },
  };
}

/**
 * @param {{ templateKeyOrId: string; includeTest?: boolean }} opts
 */
export async function fetchTemplateDetailBundle(opts) {
  const lookup = String(opts.templateKeyOrId || "").trim();
  if (!lookup) return { error: "Mangler id", status: 400 };

  const includeTest = Boolean(opts.includeTest);
  await connectDb();
  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orConditions = [{ key: lookup }];
  if (mongoose.Types.ObjectId.isValid(lookup)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(lookup) });
  }

  const docRaw = await TaskTemplate.findOne(
    andQuery(scope, /** @type {Record<string, unknown>} */ ({ $or: orConditions })),
  ).lean();

  const doc = docRaw && typeof docRaw === "object" ? /** @type {Record<string, unknown>} */ (docRaw) : null;
  if (!doc?._id) return { error: "Ikke fundet", status: 404 };

  const oid = String(doc._id);
  const used = await Task.countDocuments(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, { templateId: doc._id instanceof mongoose.Types.ObjectId ? doc._id : new mongoose.Types.ObjectId(oid) })
    ),
  );

  /** @type {Map<string, number>} */
  const m = new Map([[oid, used]]);

  const depRaw = await Department.find(/** @type {Record<string, unknown>} */ (scope)).sort({ name: 1 }).lean();
  const departments = (Array.isArray(depRaw) ? depRaw : []).map(mapDepartmentTaskRow);
  const team = await fetchTeamForTemplates(scope);

  const row = buildTaskTemplateWireRow(doc, m);

  /** @type {{ id: string; at: string; kind: string; summary: string }[]} */
  const activityEntries = [];
  const cu = contractToIsoDateOnly(doc.createdAt) || "";
  const uu = contractToIsoDateOnly(doc.updatedAt) || "";
  if (cu) activityEntries.push({ id: `${row.id}-c`, at: cu, kind: "Timeline", summary: "Skabelon registreret." });
  if (uu && uu !== cu) activityEntries.push({ id: `${row.id}-u`, at: uu, kind: "Opdatering", summary: "Seneste ændring (server-tidsstempel)." });

  return {
    source: /** @type {const} */ ("database"),
    template: row,
    departments,
    team,
    activityEntries,
  };
}

/** @param {Record<string, unknown>} body */
export async function createTaskTemplateMongo(body, includeTest) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "Titel mangler", status: 400 };

  await connectDb();

  let key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) {
    key = slugifyStableKey(title, "tpl");
    const taken = await TaskTemplate.findOne({ key }).select("_id").lean();
    if (taken) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  }

  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {string | undefined} */
  let departmentKeyStr;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let departmentIdField;
  const dkRaw = typeof body.departmentKey === "string" ? body.departmentKey.trim() : "";
  if (dkRaw && dkRaw !== "—") {
    const depDoc = await Department.findOne(andQuery(scope, { key: dkRaw })).select("_id key").lean();
    if (depDoc?.key != null && depDoc._id) {
      departmentKeyStr = String(depDoc.key);
      departmentIdField = /** @type {mongoose.Types.ObjectId} */ (depDoc._id);
    }
  }

  let prio = String(body.defaultPriority ?? "medium");
  if (!PRIOS.includes(/** @type {any} */ (prio))) prio = "medium";

  let scopeUi = String(body.scope ?? "retainer");
  if (!SCOPE_ENUM.includes(/** @type {any} */ (scopeUi))) scopeUi = "retainer";

  const sh =
    typeof body.suggestedHours === "number" && Number.isFinite(body.suggestedHours) ? body.suggestedHours : undefined;

  const dod =
    typeof body.defaultDueOffsetDays === "number" && Number.isFinite(body.defaultDueOffsetDays) ?
      body.defaultDueOffsetDays
    : undefined;

  const assigneeMemberKeys = await resolveAssigneeMemberKeysFromBody(body, scope);

  /** @type {Record<string, unknown>} */
  const doc = {
    key,
    title,
    description: typeof body.description === "string" ? body.description : "",
    departmentKey: departmentKeyStr,
    departmentId: departmentIdField,
    defaultPriority: prio,
    suggestedHours: sh,
    defaultDueOffsetDays: dod,
    scope: scopeUi,
    assigneeMemberKeys,
    billable: body.billable !== false,
    active: body.active === false ? false : true,
    isTest: body.isTest === true,
  };

  try {
    const created = await TaskTemplate.create(doc);
    const fresh = await TaskTemplate.findById(created._id).lean();
    if (!fresh) return { error: "Kunne ikke oprette", status: 500 };
    const used = new Map([[String(fresh._id), 0]]);
    return {
      ok: /** @type {const} */ (true),
      wire: buildTaskTemplateWireRow(/** @type {Record<string, unknown>} */ (fresh), used),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Databasefejl";
    if (msg.includes("duplicate")) return { error: "Nøgle allerede i brug", status: 409 };
    return { error: msg, status: 500 };
  }
}

/**
 * @param {string} templateKeyOrId
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} patch
 */
export async function updateTaskTemplateMongo(templateKeyOrId, includeTest, patch) {
  const id = templateKeyOrId.trim();
  if (!id) return { error: "Mangler skabelon-id", status: 400 };

  await connectDb();
  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orConditions = [{ key: id }];
  if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

  const existingRaw = await TaskTemplate.findOne(andQuery(scope, { $or: orConditions })).lean();
  const existing =
    existingRaw != null ? /** @type {Record<string, unknown>} */ (existingRaw) : null;
  if (!existing?._id) return { error: "Ikke fundet", status: 404 };

  /** @type {Record<string, unknown>} */
  const $set = {};

  /** @type {Record<string, number>} */
  const $unset = /** @type {Record<string, number>} */ ({});

  if (typeof patch.title === "string" && patch.title.trim()) $set.title = patch.title.trim();
  if (typeof patch.description === "string") $set.description = patch.description;

  if ("active" in patch) $set.active = patch.active !== false;

  if (typeof patch.defaultPriority === "string" && PRIOS.includes(/** @type {any} */ (patch.defaultPriority))) {
    $set.defaultPriority = patch.defaultPriority;
  }

  if (typeof patch.scope === "string" && SCOPE_ENUM.includes(/** @type {any} */ (patch.scope))) {
    $set.scope = patch.scope;
  }

  if (typeof patch.suggestedHours === "number" && Number.isFinite(patch.suggestedHours)) {
    $set.suggestedHours = patch.suggestedHours;
  } else if (patch.suggestedHours === null || patch.suggestedHours === "") {
    $unset.suggestedHours = 1;
  }

  if (typeof patch.defaultDueOffsetDays === "number" && Number.isFinite(patch.defaultDueOffsetDays)) {
    $set.defaultDueOffsetDays = patch.defaultDueOffsetDays;
  } else if (patch.defaultDueOffsetDays === null) {
    $unset.defaultDueOffsetDays = 1;
  }

  if ("departmentKey" in patch) {
    const raw = patch.departmentKey;
    const k = typeof raw === "string" ? raw.trim() : "";
    if (!k || k === "—") {
      $unset.departmentKey = 1;
      $unset.departmentId = 1;
    } else {
      const depDoc = await Department.findOne(andQuery(scope, { key: k })).select("_id key").lean();
      if (depDoc?.key != null && depDoc._id) {
        $set.departmentKey = String(depDoc.key);
        $set.departmentId = depDoc._id;
      }
    }
  }

  if ("assigneeMemberKeys" in patch || "assigneeMemberKey" in patch) {
    const resolved = await resolveAssigneeMemberKeysFromBody(patch, scope);
    $set.assigneeMemberKeys = resolved;
  }

  if ("billable" in patch) {
    $set.billable = patch.billable !== false;
  }

  /** @type {Record<string, unknown>} */
  const updateDoc = {};
  if (Object.keys($set).length) updateDoc.$set = $set;
  if (Object.keys($unset).length) updateDoc.$unset = $unset;

  if (!updateDoc.$set && !updateDoc.$unset) {
    return { error: "Ingen felter opdateret", status: 400 };
  }

  await TaskTemplate.updateOne({ _id: existing._id }, updateDoc).exec();

  const fresh = await TaskTemplate.findById(existing._id).lean();
  if (!fresh) return { error: "Opdateringsfejl", status: 500 };

  const used = await Task.countDocuments(
    /** @type {Record<string, unknown>} */ (andQuery(scope, { templateId: existing._id })),
  );
  const usedMap = new Map([[String(fresh._id), used]]);

  return {
    ok: /** @type {const} */ (true),
    wire: buildTaskTemplateWireRow(/** @type {Record<string, unknown>} */ (fresh), usedMap),
  };
}

/**
 * @param {string} templateKeyOrId
 * @param {boolean} includeTest
 */
export async function deleteTaskTemplateMongo(templateKeyOrId, includeTest) {
  const id = templateKeyOrId.trim();
  if (!id) return { error: "Mangler id", status: 400 };

  await connectDb();
  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orConditions = [{ key: id }];
  if (mongoose.Types.ObjectId.isValid(id)) orConditions.push({ _id: new mongoose.Types.ObjectId(id) });

  const existingRaw = await TaskTemplate.findOne(andQuery(scope, { $or: orConditions })).lean();
  const existing =
    existingRaw != null ? /** @type {Record<string, unknown>} */ (existingRaw) : null;
  if (!existing?._id) return { error: "Ikke fundet", status: 404 };

  const inUse = await Task.countDocuments(
    /** @type {Record<string, unknown>} */ (andQuery(scope, { templateId: existing._id })),
  );
  if (inUse > 0) {
    return { error: `Skabelonen bruges af ${inUse} opgave(r) — fjern kobling først`, status: 409 };
  }

  const res = await TaskTemplate.deleteOne({ _id: existing._id }).exec();
  if ((res?.deletedCount ?? 0) < 1) return { error: "Ikke fundet", status: 404 };
  return { ok: /** @type {const} */ (true) };
}
