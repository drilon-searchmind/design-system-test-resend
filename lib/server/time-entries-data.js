import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import User from "@/lib/db/models/user";
import { normalizeEmail } from "@/lib/auth/workspace-sso";
import { connectDb } from "@/lib/db/mongoose";
import {
  memberDefaultDepartmentKey,
  resolveTimeEntryDepartmentKey,
} from "@/lib/server/resolve-time-entry-department";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { TIME_DAILY_TARGET_MINUTES } from "@/lib/crm/static-data";
import { timeWeekGoalMinutes } from "@/lib/crm/time-utils";
import { mapDepartmentTaskRow } from "@/lib/server/tasks-data";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * Fast path: session.user.id is already a Mongo ObjectId string.
 * @param {import('next-auth').Session | null | undefined} session
 */
export function mongoUserIdFromSession(session) {
  const raw = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

/**
 * Resolve CRM user id from session — ObjectId on user.id, else lookup by email (Google SSO).
 * @param {import('next-auth').Session | null | undefined} session
 */
export async function resolveMongoUserIdFromSession(session) {
  const direct = mongoUserIdFromSession(session);
  if (direct) return direct;

  const email = normalizeEmail(session?.user?.email);
  if (!email) return null;

  await connectDb();
  const userDoc = await User.findOne({ email }).select("_id").lean();
  return userDoc?._id ? /** @type {mongoose.Types.ObjectId} */ (userDoc._id) : null;
}

/**
 * @param {import('next-auth').Session | null | undefined} session
 */
async function mineTimeOwnershipFilter(session) {
  const uid = await resolveMongoUserIdFromSession(session);
  if (!uid) return /** @type {Record<string, unknown>} */ ({ ok: false, error: "Unauthorized", status: 401 });

  await connectDb();
  const tm = await TeamMember.findOne({ userId: uid }).select("_id").lean();
  /** @type {Record<string, unknown>[]} */
  const or = [{ userId: uid }];
  if (tm?._id) or.push({ teamMemberId: tm._id });
  return /** @type {Record<string, unknown>} */ ({ ok: true, clause: /** @type {Record<string, unknown>} */ ({ $or: or }) });
}

/** @returns {{ from: Date; to: Date } | null} */
export function boundsInclusiveFromIsoRange(fromIso, toIso) {
  const fs = typeof fromIso === "string" ? fromIso.trim().slice(0, 10) : "";
  const ts = typeof toIso === "string" ? toIso.trim().slice(0, 10) : "";
  if (!fs || !ts) return null;
  const from = new Date(`${fs}T00:00:00`);
  const to = new Date(`${ts}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

/** @returns {Promise<string>} */
async function mineMemberLabel(session) {
  const uid = await resolveMongoUserIdFromSession(session);
  if (!uid) return "";
  await connectDb();
  const m = await TeamMember.findOne({ userId: uid }).select("name").lean();
  return typeof m?.name === "string" && m.name.trim() ? m.name.trim() : "";
}

/** @returns {Promise<string>} */
export async function utcTodayCalendarKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * @param {Record<string, unknown>} doc
 * @param {{ name?: string | null } | null} clientMini
 * @param {{ key?: string; id?: string; title?: string | null } | null} taskMini
 * @param {string | undefined} deptColorCss
 */
export function buildTimeEntryWireRow(doc, clientMini, taskMini, deptColorCss) {
  const oid = doc._id != null ? String(doc._id) : "";

  const keyTrim = typeof doc.key === "string" ? doc.key.trim() : "";
  const id = keyTrim || (oid ? `te-${oid.slice(-8)}` : "te-unknown");

  const workedRaw =
    doc.workedAt instanceof Date ? doc.workedAt : new Date(/** @type {any} */ (doc.workedAt));
  const worked = Number.isNaN(workedRaw.getTime()) ? new Date() : workedRaw;

  const hh = String(worked.getHours()).padStart(2, "0");
  const mm = String(worked.getMinutes()).padStart(2, "0");

  let durRaw =
    typeof doc.durationMinutes === "number" ? doc.durationMinutes : Number(doc.durationMinutes);
  if (!Number.isFinite(durRaw)) durRaw = 0;
  durRaw = Math.max(0, Math.round(durRaw));

  const bill = doc.billable !== false;
  const slug =
    typeof doc.clientSlug === "string" && doc.clientSlug.trim()
      ? String(doc.clientSlug).trim()
      : null;

  let clientName = typeof clientMini?.name === "string" && clientMini.name.trim() ? clientMini.name.trim() : null;
  if (!clientName && slug) clientName = slug;

  let taskKey =
    typeof doc.taskKey === "string" && doc.taskKey.trim() ? doc.taskKey.trim() : /** @type {null} */ (null);
  if ((!taskKey || taskKey === "") && taskMini?.id && String(taskMini.id).trim()) {
    taskKey = String(taskMini.id).trim();
  }
  if ((!taskKey || taskKey === "") && doc.taskId) {
    taskKey = String(doc.taskId);
  }

  const taskTitle =
    typeof taskMini?.title === "string" && taskMini.title.trim() ?
      taskMini.title.trim()
    : taskKey;

  /** @type {string | null} */
  let dept =
    typeof doc.departmentKey === "string" && doc.departmentKey.trim()
      ?
        /** @type {string | null} */ (doc.departmentKey.trim())
      : /** @type {null} */ (null);

  /** @type {"manual" | "timer"} */
  const src = doc.source === "timer" ? "timer" : "manual";

  return {
    id,
    mongoId: oid,
    at: `${hh}:${mm}`,
    workedAtIso: worked.toISOString(),
    durationMinutes: durRaw,
    clientSlug: slug,
    clientName,
    taskKey,
    taskTitle,
    dept,
    ...(deptColorCss ? { deptColorVar: deptColorCss } : {}),
    billable: bill,
    desc: typeof doc.description === "string" ? doc.description : "",
    source: src,
  };
}

/**
 * @param {Record<string, unknown>[]} docs
 * @param {Record<string, unknown>} scope
 */
async function lookupsForPortfolio(docs, scope) {
  const clientIds = [
    ...new Set(
      docs
        .map((d) =>
          d.clientId ? (mongoose.Types.ObjectId.isValid(d.clientId) ? String(d.clientId) : "") : "",
        )
        .filter(Boolean),
    ),
  ];
  /** @type {Record<string, { name?: string }>} */
  const clientByOid = {};
  if (clientIds.length) {
    const rows =
      /** @type {Record<string, unknown>[]} */
      (
        await Client.find(
          /** @type {Record<string, unknown>} */ (
            andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: { $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)) } }))
          ),
        )
          .select("name slug")
          .lean()
      );
    for (const c of rows) {
      clientByOid[String(c._id)] = { name: typeof c.name === "string" ? c.name : "" };
    }
  }

  const taskIds = [
    ...new Set(
      docs
        .map((d) => (d.taskId ? (mongoose.Types.ObjectId.isValid(d.taskId) ? String(d.taskId) : "") : ""))
        .filter(Boolean),
    ),
  ];
  /** @type {Record<string, { title?: string; key?: string }>} */
  const taskByOid = {};
  if (taskIds.length) {
    const trows =
      /** @type {Record<string, unknown>[]} */
      (
        await Task.find(
          /** @type {Record<string, unknown>} */ (
            andQuery(scope, /** @type {Record<string, unknown>} */ ({ _id: { $in: taskIds.map((id) => new mongoose.Types.ObjectId(id)) } }))
          ),
        )
          .select("title")
          .lean()
      );
    for (const t of trows) {
      taskByOid[String(t._id)] = {
        title: typeof t.title === "string" ? t.title : "",
        id: String(t._id),
      };
    }
  }

  /** @type {Record<string, unknown>[]} */
  const depRows =
    /** @type {Record<string, unknown>[]} */
    (
      await Department.find(/** @type {Record<string, unknown>} */ (scope)).sort({ name: 1 }).lean()
    );

  /** @type {Record<string, string>} */
  const colorByDeptKey = {};
  for (const dr of depRows) {
    const row = mapDepartmentTaskRow(dr);
    if (typeof row?.id === "string" && row.id)
      colorByDeptKey[row.id] = typeof row.color === "string" ? row.color : "";
  }

  return {
    departments: depRows.map(mapDepartmentTaskRow),
    clientByOid,
    taskByOid,
    colorByDeptKey,
  };
}

/** @returns {Awaited<ReturnType<typeof buildTimeEntryWireRow>>} */
function wireFromDocCaches(dRaw, lk) {
  /** @type {Record<string, unknown>} */
  const d = typeof dRaw === "object" && dRaw !== null ? /** @type {Record<string, unknown>} */ (dRaw) : {};

  /** @type {Record<string, { name?: string }>} */
  const clientByOid = lk?.clientByOid ?? {};

  /** @type {Record<string, { title?: string; key?: string }>} */
  const taskByOid = lk?.taskByOid ?? {};

  /** @type {Record<string, string>} */
  const colorByDeptKey = lk?.colorByDeptKey ?? {};

  const cMini =
    typeof d.clientId === "object" && d.clientId != null ? clientByOid[String(d.clientId)] ?? null : null;

  /** @type {Record<string, unknown> | undefined} */
  let tMiniRaw =
    typeof d.taskId === "object" && d.taskId != null ? taskByOid[String(d.taskId)] : undefined;

  let tMini = tMiniRaw ?
    /** @type {{ title?: string; id?: string } | null} */ ({
      title: typeof tMiniRaw.title === "string" ? tMiniRaw.title : undefined,
      id: typeof tMiniRaw.id === "string" ? tMiniRaw.id : undefined,
    })
  : null;

  if ((!tMini || !tMini.id) && typeof d.taskKey === "string" && d.taskKey.trim()) {
    tMini = {
      id: String(d.taskKey).trim(),
      title: typeof tMini?.title === "string" ? tMini.title : String(d.taskKey).trim(),
    };
  }

  const dkRaw = typeof d.departmentKey === "string" && d.departmentKey.trim() ? d.departmentKey.trim() : "";

  return buildTimeEntryWireRow(d, cMini ?? null, tMini, dkRaw ? colorByDeptKey[dkRaw] : undefined);
}

export async function entryWireFromMongoDoc(scope, docRaw) {
  const lk = /** @type {Awaited<ReturnType<typeof lookupsForPortfolio>>} */ (await lookupsForPortfolio([docRaw], scope));
  return wireFromDocCaches(docRaw, lk);
}

/**
 * @param {{ session: import('next-auth').Session; includeTest?: boolean; fromIso: string; toIso: string }} opts
 */
export async function fetchTimeEntriesPortfolio(opts) {
  await connectDb();
  const mine = await mineTimeOwnershipFilter(opts.session);
  if (!(mine.ok === true)) {
    /** @type {Record<string, unknown>} */
    const err = mine;
    return /** @type {Record<string, unknown>} */ ({ error: err.error, status: err.status ?? 401 });
  }

  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));

  const bounds = boundsInclusiveFromIsoRange(opts.fromIso, opts.toIso);
  if (!bounds) return /** @type {Record<string, unknown>} */ ({ error: "Ugyldigt datointerval", status: 400 });

  const docRange = /** @type {Record<string, unknown>} */ ({
    workedAt: { $gte: bounds.from, $lte: bounds.to },
  });

  /** @type {Record<string, unknown>[]} */
  const docsRaw =
    /** @type {Record<string, unknown>[]} */ (
      await TimeEntry.find(
        /** @type {Record<string, unknown>} */ (andQuery(scope, mine.clause ?? {}, docRange)),
      )
        .sort({ workedAt: -1 })
        .limit(750)
        .lean()
    );

  const docs = Array.isArray(docsRaw) ? docsRaw : [];

  /** @type {Awaited<ReturnType<typeof lookupsForPortfolio>>} */
  const lkCaches = await lookupsForPortfolio(docs, scope);

  /** @type {ReturnType<typeof buildTimeEntryWireRow>[]} */
  const entries = docs.map((row) =>
    wireFromDocCaches(/** @type {Record<string, unknown>} */ (row), lkCaches),
  );

  const mk = await mineMemberLabel(opts.session);
  const tn = await utcTodayCalendarKey();

  const uid = await resolveMongoUserIdFromSession(opts.session);
  const tmDefault =
    uid ?
      /** @type {{ departmentKey?: string; disciplineKeys?: string[] } | null} */ (
        await TeamMember.findOne({ userId: uid }).select("departmentKey disciplineKeys").lean()
      )
    : null;
  const defaultDepartmentKey = memberDefaultDepartmentKey(tmDefault);

  return {
    source: /** @type {const} */ ("database"),
    fromIso: opts.fromIso.trim().slice(0, 10),
    toIso: opts.toIso.trim().slice(0, 10),
    dailyTargetMinutes: TIME_DAILY_TARGET_MINUTES,
    weekGoalMinutes: timeWeekGoalMinutes(TIME_DAILY_TARGET_MINUTES),
    todayKey: tn,
    mineLabel: mk,
    departments: lkCaches.departments,
    entries,
    defaultDepartmentKey: defaultDepartmentKey ?? undefined,
    ...(await buildTimeEntryPicklists(scope)),
  };
}

/**
 * @param {Record<string, unknown>} scope
 */
async function buildTimeEntryPicklists(scope) {
  /** @type {Record<string, unknown>[]} */
  const clientDocs =
    /** @type {Record<string, unknown>[]} */ (
      await Client.find(/** @type {Record<string, unknown>} */ (scope)).select("slug name").sort({ name: 1 }).lean()
    );

  const clientsPicklist = clientDocs
    .map((c) => ({
      value: String(c.slug ?? ""),
      label: String(c.name ?? c.slug ?? "—"),
    }))
    .filter((x) => x.value.trim());

  /** @type {Record<string, unknown>[]} */
  const taskDocs =
    /** @type {Record<string, unknown>[]} */ (
      await Task.find(/** @type {Record<string, unknown>} */ (scope))
        .select("title clientSlug departmentKey")
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean()
    );

  const tasksPicklist = taskDocs.map((t) => ({
    value: String(t._id ?? ""),
    label: typeof t.title === "string" ? String(t.title) : "—",
    clientSlug: typeof t.clientSlug === "string" ? t.clientSlug : "",
    departmentKey: typeof t.departmentKey === "string" ? t.departmentKey.trim() : "",
  }));

  return { clientsPicklist, tasksPicklist };
}

/** Production clients + tasks for timer and quick-log UI. */
export async function fetchTimeEntryPicklistsForProduction() {
  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));
  return buildTimeEntryPicklists(scope);
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeHm HH:mm
 */
function naiveLocalWorkedAt(dateStr, timeHm) {
  const dPart = typeof dateStr === "string" ? dateStr.trim().slice(0, 10) : "";
  const tPart =
    typeof timeHm === "string" && timeHm.trim() ? timeHm.trim().slice(0, 8) : "12:00";
  if (!dPart || dPart.length < 10) return null;
  const tp = tPart.length >= 5 ? tPart.slice(0, 5) : `${tPart}:00`.slice(0, 5);
  const [y, mo, dd] = dPart.split("-").map((x) => Number.parseInt(x, 10));
  const [hStr, mStr] = tp.split(":");
  const h = Number.parseInt(hStr, 10);
  const mi = Number.parseInt(mStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(dd)) return null;
  const HH = Number.isFinite(h) ? h : 12;
  const MM = Number.isFinite(mi) ? mi : 0;
  const d = new Date(y, mo - 1, dd, HH, MM, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {Record<string, unknown>} body */
async function findClientForMutationScoped(body, scope) {
  const slug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : "";
  const cidRaw = typeof body.clientId === "string" ? body.clientId.trim() : "";
  /** @type {Record<string, unknown>[]} */
  const clauses = [];
  if (slug) clauses.push({ slug });
  if (mongoose.Types.ObjectId.isValid(cidRaw)) clauses.push({ _id: new mongoose.Types.ObjectId(cidRaw) });

  if (!clauses.length) return null;
  /** @type {Record<string, unknown>} */
  const q = clauses.length === 1 ? clauses[0] : { $or: clauses };
  const doc =
    clauses.length ?
      /** @type {Record<string, unknown> | null} */ (
        await Client.findOne(/** @type {Record<string, unknown>} */ (andQuery(scope, /** @type {Record<string, unknown>} */ (q))))
          .lean()
      )
    : null;
  return doc && typeof doc === "object" ? doc : null;
}

/** @returns {Promise<{ doc: Record<string, unknown>; scope: Record<string, unknown> } | { error: string; status: number }>} */
async function loadOwnedEntryDoc(opts) {
  const lookup = typeof opts.lookup === "string" ? opts.lookup.trim() : "";
  if (!lookup) return /** @type {const} */ ({ error: "Mangler id", status: 400 });

  await connectDb();
  const mine = await mineTimeOwnershipFilter(opts.session);
  if (!(mine.ok === true)) return /** @type {const} */ ({ error: String(mine.error ?? "Unauthorized"), status: typeof mine.status === "number" ? mine.status : 401 });

  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));

  /** @type {Record<string, unknown>[]} */
  const orLookup = [{ key: lookup }];
  if (mongoose.Types.ObjectId.isValid(lookup)) orLookup.push({ _id: new mongoose.Types.ObjectId(lookup) });

  const raw = /** @type {Record<string, unknown> | null} */ (
    await TimeEntry.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, mine.clause ?? {}, /** @type {Record<string, unknown>} */ ({ $or: orLookup }))
      ),
    ).lean()
  );

  if (!raw || !raw._id) return /** @type {const} */ ({ error: "Ikke fundet", status: 404 });

  return { doc: raw, scope, mineClause: mine.clause ?? {} };
}

/** @returns {Promise<Record<string, unknown> | { error: string; status?: number }>} */
async function resolveDepartmentMutation(body, scope) {
  const dkRaw = typeof body.departmentKey === "string" ? body.departmentKey.trim() : "";
  if (!dkRaw || dkRaw === "—") return { departmentKeyUnset: true };
  const depDoc = await Department.findOne(
    /** @type {Record<string, unknown>} */ (
      andQuery(/** @type {Record<string, unknown>} */ (scope), { key: dkRaw })
    ),
  )
    .select("_id key")
    .lean();
  if (!depDoc?._id) return /** @type {const} */ ({ error: "Ukendt afdeling", status: 400 });
  /** @type {Record<string, unknown>} */
  return {
    departmentKeyStr: typeof depDoc.key === "string" ? depDoc.key : dkRaw,
    departmentIdField: /** @type {mongoose.Types.ObjectId} */ (depDoc._id),
  };
}

/**
 * @param {{ session: import('next-auth').Session; entryKeyOrId: string; includeTest?: boolean }} opts
 */
export async function fetchTimeEntryDetailBundle(opts) {
  const lookup = typeof opts.entryKeyOrId === "string" ? opts.entryKeyOrId.trim() : "";
  if (!lookup) return /** @type {Record<string, unknown>} */ ({ error: "Mangler id", status: 400 });

  const loaded = /** @type {Awaited<ReturnType<typeof loadOwnedEntryDoc>> | { doc: Record<string, unknown>; scope: Record<string, unknown>; mineClause?: Record<string, unknown> }} */ (
    await loadOwnedEntryDoc({
      session: opts.session,
      lookup,
      includeTest: Boolean(opts.includeTest),
    })
  );

  if ("error" in loaded && loaded.error) {
    /** @type {Record<string, unknown>} */
    const err = loaded;
    return /** @type {Record<string, unknown>} */ ({
      error: err.error,
      status: typeof err.status === "number" ? err.status : 400,
    });
  }

  const { doc } = loaded;
  /** @type {Record<string, unknown>} */
  const scope = loaded.scope ?? {};

  const L = await lookupsForPortfolio([doc], scope);
  const wire = wireFromDocCaches(doc, L);

  const cre =
    doc.createdAt instanceof Date ?
      doc.createdAt.toISOString()
    : doc.createdAt ?
      new Date(/** @type {any} */ (doc.createdAt)).toISOString()
    : "";
  const upd =
    doc.updatedAt instanceof Date ?
      doc.updatedAt.toISOString()
    : doc.updatedAt ?
      new Date(/** @type {any} */ (doc.updatedAt)).toISOString()
    : "";

  /** @type {{ id: string; at: string; kind: string; summary: string }[]} */
  const activityEntries = [];
  const srcLbl = typeof wire.source === "string" ? wire.source : "manual";
  if (cre)
    activityEntries.push({
      id: `${wire.id}-c`,
      at: cre,
      kind: "Oprettelse",
      summary: `Registrering oprettet (${srcLbl}).`,
    });
  if (upd && upd !== cre)
    activityEntries.push({
      id: `${wire.id}-u`,
      at: upd,
      kind: "Opdatering",
      summary: "Seneste ændring.",
    });

  const clientDocs =
    /** @type {Record<string, unknown>[]} */
    (await Client.find(/** @type {Record<string, unknown>} */ (scope)).select("slug name").sort({ name: 1 }).lean());

  const taskDocs =
    /** @type {Record<string, unknown>[]} */
    (
      await Task.find(/** @type {Record<string, unknown>} */ (scope))
        .select("title clientSlug departmentKey")
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean()
    );

  return {
    source: /** @type {const} */ ("database"),
    entry: wire,
    departments: L.departments,
    clientsPicklist: clientDocs
      .map((c) => ({ value: String(c.slug ?? ""), label: String(c.name ?? c.slug ?? "—") }))
      .filter((x) => x.value.trim()),
    tasksPicklist: taskDocs.map((t) => ({
      value: String(t._id ?? ""),
      label: typeof t.title === "string" ? String(t.title) : "—",
      clientSlug: typeof t.clientSlug === "string" ? t.clientSlug : "",
      departmentKey: typeof t.departmentKey === "string" ? t.departmentKey.trim() : "",
    })),
    activityEntries,
  };
}

/**
 * @param {import('next-auth').Session} session
 * @param {Record<string, unknown>} body
 */
export async function createTimeEntryMongo(session, body, includeTest) {
  const uid = await resolveMongoUserIdFromSession(session);
  if (!uid) return /** @type {const} */ ({ error: "Unauthorized", status: 401 });

  await connectDb();

  /** @type {Record<string, unknown>} */
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  const tm =
    /** @type {{ _id?: mongoose.Types.ObjectId; key?: string; departmentKey?: string; disciplineKeys?: string[] } | null} */
    (
      await TeamMember.findOne({ userId: uid }).select("_id key departmentKey disciplineKeys").lean()
    );

  let durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : Number(body.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return /** @type {const} */ ({ error: "Angiv gyldigt antal minutter", status: 400 });
  }
  durationMinutes = Math.round(durationMinutes);

  const billable = body.billable !== false;

  /** @type {string | undefined} */
  let clientSlugStr;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let clientIdField;

  if (billable) {
    const clientDoc = /** @type {Record<string, unknown> | null} */ (await findClientForMutationScoped(body, scope));
    if (!clientDoc?._id || typeof clientDoc.slug !== "string" || !clientDoc.slug.trim()) {
      return /** @type {const} */ ({ error: "Vælg kunde for billable tid", status: 400 });
    }
    clientSlugStr = clientDoc.slug.trim();
    clientIdField = /** @type {mongoose.Types.ObjectId} */ (clientDoc._id);
  }

  const dkRaw = typeof body.departmentKey === "string" ? body.departmentKey.trim() : "";
  /** @type {string | undefined} */
  let departmentKeyStr;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let departmentIdField;

  /** @type {{ _id?: mongoose.Types.ObjectId; clientSlug?: string; departmentKey?: string } | null} */
  let linkedTaskDoc = null;

  const taskKeyTrim = typeof body.taskKey === "string" ? body.taskKey.trim() : "";
  /** @type {string | undefined} */
  let taskKeyResolved;
  /** @type {mongoose.Types.ObjectId | undefined} */
  let taskOid;

  if (taskKeyTrim) {
    if (!mongoose.Types.ObjectId.isValid(taskKeyTrim)) {
      return /** @type {const} */ ({ error: "Ukendt opgave", status: 400 });
    }
    linkedTaskDoc =
      /** @type {{ _id?: mongoose.Types.ObjectId; clientSlug?: string; departmentKey?: string } | null} */
      (
        await Task.findOne(
          /** @type {Record<string, unknown>} */ (
            andQuery(scope, { _id: new mongoose.Types.ObjectId(taskKeyTrim) })
          ),
        )
          .select("_id clientSlug departmentKey")
          .lean()
      );
    if (!linkedTaskDoc?._id) return /** @type {const} */ ({ error: "Ukendt opgave", status: 400 });
    if (billable && clientSlugStr) {
      const tcs = typeof linkedTaskDoc.clientSlug === "string" ? linkedTaskDoc.clientSlug.trim() : "";
      if (tcs && tcs !== clientSlugStr) {
        return /** @type {const} */ ({ error: "Opgave passer ikke til valgt kunde", status: 400 });
      }
    }
    taskKeyResolved = String(linkedTaskDoc._id);
    taskOid = /** @type {mongoose.Types.ObjectId} */ (linkedTaskDoc._id);
  }

  const resolvedDeptKey = await resolveTimeEntryDepartmentKey({
    explicitKey: dkRaw,
    taskOid,
    taskDoc: linkedTaskDoc,
    memberDoc: tm,
    scope,
  });

  if (resolvedDeptKey) {
    const depRes =
      /** @type {Awaited<ReturnType<typeof resolveDepartmentMutation>> | { error: string; status: number }} */ (
        await resolveDepartmentMutation({ departmentKey: resolvedDeptKey }, scope)
      );
    if ("error" in depRes && typeof depRes.error === "string")
      return /** @type {const} */ ({ error: depRes.error, status: depRes.status ?? 400 });

    if ("departmentKeyStr" in depRes && typeof depRes.departmentKeyStr === "string")
      departmentKeyStr = /** @type {string} */ (depRes.departmentKeyStr);

    if ("departmentIdField" in depRes && depRes.departmentIdField) {
      departmentIdField = /** @type {mongoose.Types.ObjectId} */ (depRes.departmentIdField);
    }
  }

  const workedDateRaw = typeof body.workedDate === "string" ? body.workedDate.trim().slice(0, 10) : "";
  const workedTimeRaw = typeof body.workedTime === "string" ? body.workedTime.trim() : "";

  /** @type {Date | null} */
  let workedAt = naiveLocalWorkedAt(workedDateRaw, workedTimeRaw);
  if (!workedAt) workedAt = naiveLocalWorkedAt(workedDateRaw, "12:00");

  const workedFallback = typeof body.workedAtIso === "string" && body.workedAtIso.trim().length ?
    new Date(body.workedAtIso.trim())
  : null;

  if (!workedAt || Number.isNaN(workedAt.getTime())) workedAt = workedFallback;
  if (!workedAt || Number.isNaN(workedAt.getTime())) return /** @type {const} */ ({ error: "Ugyldig dato/tid", status: 400 });

  const desc = typeof body.description === "string" ? body.description : "";

  /** @type {Record<string, unknown>} */
  const doc = /** @type {any} */ ({
    userId: uid,
    teamMemberId: tm?._id,
    memberKey: typeof tm?.key === "string" && tm.key.trim() ? tm.key.trim() : undefined,
    durationMinutes,
    workedAt,
    billable,
    description: desc,
    source: body.source === "timer" ? "timer" : "manual",
  });

  if (billable && clientSlugStr) {
    doc.clientSlug = clientSlugStr;
    if (clientIdField) doc.clientId = clientIdField;
  } else {
    doc.clientSlug = undefined;
    doc.clientId = undefined;
  }

  if (departmentKeyStr) {
    doc.departmentKey = departmentKeyStr;
    if (departmentIdField) doc.departmentId = departmentIdField;
  }

  if (taskKeyResolved) {
    doc.taskKey = taskKeyResolved;
    if (taskOid) doc.taskId = taskOid;
  }

  if (typeof body.isTest === "boolean" ? body.isTest : false) doc.isTest = true;

  try {
    const inserted = /** @type {any} */ (await TimeEntry.create(doc));
    /** @type {Record<string, unknown> | null} */
    const created =
      inserted?._id != null ?
        /** @type {Record<string, unknown> | null} */
        (
          await TimeEntry.findById(inserted._id).lean()
        )
      : null;
    if (!created) return /** @type {const} */ ({ error: "Kunne ikke oprette", status: 500 });
    const wire = await entryWireFromMongoDoc(scope, created);
    return /** @type {const} */ ({ ok: true, wire });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Databasefejl";
    return /** @type {const} */ ({ error: msg, status: 500 });
  }
}

/**
 * @param {import('next-auth').Session} session
 * @param {string} lookupKeyOrId
 * @param {Record<string, unknown>} body
 */
export async function updateTimeEntryMongo(session, lookupKeyOrId, includeTest, body) {
  const loaded = await loadOwnedEntryDoc({ session, lookup: lookupKeyOrId, includeTest });
  if ("error" in loaded && loaded.error) return /** @type {const} */ ({ error: loaded.error, status: loaded.status ?? 400 });

  if (!("doc" in loaded)) return /** @type {const} */ ({ error: "Ikke fundet", status: 404 });

  /** @type {Record<string, unknown>} */
  const mineClause =
    typeof loaded.mineClause === "object" && loaded.mineClause ?
      /** @type {Record<string, unknown>} */ (loaded.mineClause)
    : {};

  const prev = loaded.doc ?? {};
  const scope = loaded.scope ?? {};
  const mongoId =
    prev._id && mongoose.Types.ObjectId.isValid(String(prev._id)) ?
      /** @type {mongoose.Types.ObjectId} */ (prev._id)
    : null;

  if (!mongoId) return /** @type {const} */ ({ error: "Mangelfuld post", status: 500 });

  /** @type {Record<string, unknown>} */
  const $set = {};

  /** @type {Record<string, number>} */
  const $unset = {};

  if ("durationMinutes" in body && body.durationMinutes != null) {
    let dm = typeof body.durationMinutes === "number" ? body.durationMinutes : Number(body.durationMinutes);
    if (!Number.isFinite(dm) || dm <= 0)
      return /** @type {const} */ ({ error: "Angiv gyldigt antal minutter", status: 400 });
    $set.durationMinutes = Math.round(dm);
  }

  if ("description" in body) {
    const d = typeof body.description === "string" ? body.description : "";
    $set.description = d;
  }

  let billEffective = typeof prev.billable === "boolean" ? prev.billable : true;

  if ("billable" in body) {
    const bill = body.billable !== false;
    $set.billable = bill;
    billEffective = bill;
    if (!bill) {
      $unset.clientSlug = 1;
      $unset.clientId = 1;
    }
  }

  const clientProvided = typeof body.clientSlug === "string" || typeof body.clientId === "string";

  if (billEffective && clientProvided) {
    const cd = /** @type {Record<string, unknown> | null} */ (await findClientForMutationScoped(body, scope));
    if (!cd?._id || typeof cd.slug !== "string" || !String(cd.slug).trim()) {
      return /** @type {const} */ ({ error: "Ukendt kunde", status: 400 });
    }
    $set.clientSlug = String(cd.slug).trim();
    $set.clientId = /** @type {mongoose.Types.ObjectId} */ (cd._id);
  } else if (billEffective && !("billable" in body) && !$unset.clientSlug) {
    if (
      !(typeof prev.clientSlug === "string" && prev.clientSlug.trim()) &&
      !(prev.clientId && mongoose.Types.ObjectId.isValid(String(prev.clientId)))
    ) {
      return /** @type {const} */ ({
        error: "Billable kræver kunde — sæt kunde eller marker som intern.",
        status: 400,
      });
    }
  }

  if ("departmentKey" in body) {
    const rawDK = body.departmentKey;
    const k = typeof rawDK === "string" ? rawDK.trim() : "";
    if (!k || k === "—") {
      $unset.departmentKey = 1;
      $unset.departmentId = 1;
    } else {
      const depRes =
        /** @type {Awaited<ReturnType<typeof resolveDepartmentMutation>> | { departmentKeyUnset?: boolean }} */ (
          await resolveDepartmentMutation({ departmentKey: k }, scope)
        );
      if ("error" in depRes && typeof depRes.error === "string")
        return /** @type {const} */ ({ error: depRes.error, status: depRes.status ?? 400 });

      const keyResolved =
        "departmentKeyStr" in depRes && typeof depRes.departmentKeyStr === "string" ?
          depRes.departmentKeyStr
        : k;
      const idResolved =
        "departmentIdField" in depRes && depRes.departmentIdField ?
          /** @type {mongoose.Types.ObjectId} */ (depRes.departmentIdField)
        : undefined;

      $set.departmentKey = keyResolved;
      if (idResolved) $set.departmentId = idResolved;
    }
  }

  if ("taskKey" in body) {
    const tk = typeof body.taskKey === "string" ? body.taskKey.trim() : "";
    if (!tk) {
      $unset.taskKey = 1;
      $unset.taskId = 1;
    } else {
      if (!mongoose.Types.ObjectId.isValid(tk)) {
        return /** @type {const} */ ({ error: "Ukendt opgave", status: 400 });
      }
      const tdoc =
        /** @type {{ _id?: mongoose.Types.ObjectId; clientSlug?: string } | null} */
        (
          await Task.findOne(
            /** @type {Record<string, unknown>} */ (
              andQuery(scope, { _id: new mongoose.Types.ObjectId(tk) })
            ),
          )
            .select("_id clientSlug")
            .lean()
        );
      if (!tdoc?._id) return /** @type {const} */ ({ error: "Ukendt opgave", status: 400 });

      /** @type {string} */
      const clientEff =
        typeof $set.clientSlug === "string" && $set.clientSlug.trim()
          ? String($set.clientSlug).trim()
          : typeof prev.clientSlug === "string"
            ? String(prev.clientSlug).trim()
            : "";

      if (billEffective && clientEff) {
        const tcs = typeof tdoc.clientSlug === "string" ? tdoc.clientSlug.trim() : "";
        if (tcs && tcs !== clientEff) {
          return /** @type {const} */ ({ error: "Opgave passer ikke til valgt kunde", status: 400 });
        }
      }

      $set.taskKey = String(tdoc._id);
      $set.taskId = /** @type {mongoose.Types.ObjectId} */ (tdoc._id);
    }
  }

  const shiftWork =
    "workedDate" in body || "workedTime" in body || typeof body.workedAtIso === "string";

  if (shiftWork) {
    /** @type {Date} */
    const prevWorked =
      prev.workedAt instanceof Date ? prev.workedAt : new Date(/** @type {any} */ (prev.workedAt ?? Date.now()));

    const yDefault = `${prevWorked.getFullYear()}-${String(prevWorked.getMonth() + 1).padStart(2, "0")}-${String(
      prevWorked.getDate(),
    ).padStart(2, "0")}`;
    const tDefault = `${String(prevWorked.getHours()).padStart(2, "0")}:${String(prevWorked.getMinutes()).padStart(2, "0")}`;
    let ymd = typeof body.workedDate === "string" ? body.workedDate.trim().slice(0, 10) : yDefault;
    let hm = typeof body.workedTime === "string" ? body.workedTime.trim() : tDefault;

    /** @type {Date | null} */
    let nextW = naiveLocalWorkedAt(ymd, hm);
    if (
      (!(nextW && !Number.isNaN(nextW.getTime())) ||
        !(typeof body.workedDate === "string" || typeof body.workedTime === "string")) &&
      typeof body.workedAtIso === "string" &&
      body.workedAtIso.trim()
    ) {
      const rawIso = body.workedAtIso.trim();
      const tryD = new Date(rawIso);
      if (!Number.isNaN(tryD.getTime())) nextW = tryD;
      else nextW = naiveLocalWorkedAt(ymd, "12:00");
    }
    if (!nextW || Number.isNaN(nextW.getTime())) return /** @type {const} */ ({ error: "Ugyldig dato/tid", status: 400 });
    $set.workedAt = nextW;
  }

  /** @type {Record<string, unknown>} */
  const updateDoc = {};

  const setKeys = Object.keys($set);
  const unsetKeys = Object.keys($unset);

  if (setKeys.length) updateDoc.$set = $set;
  if (unsetKeys.length) updateDoc.$unset = $unset;

  if (!updateDoc.$set && !updateDoc.$unset)
    return /** @type {const} */ ({ error: "Ingen felter opdateret", status: 400 });

  /** @type {Record<string, unknown> | null} */
  const after =
    /** @type {Record<string, unknown> | null} */
    (
      await TimeEntry.findOneAndUpdate(
        /** @type {Record<string, unknown>} */ (
          andQuery(scope, mineClause, /** @type {Record<string, unknown>} */ ({ _id: mongoId }))
        ),
        /** @type {Record<string, unknown>} */ (updateDoc),
        { new: true, runValidators: true },
      ).lean()
    );

  if (!after?.["_id"]) return /** @type {const} */ ({ error: "Kunne ikke opdatere", status: 500 });
  const wire = await entryWireFromMongoDoc(scope, after);

  return /** @type {const} */ ({ ok: true, wire });
}

/**
 * @param {import('next-auth').Session} session
 * @param {string} lookupKeyOrId
 */
export async function deleteTimeEntryMongo(session, lookupKeyOrId, includeTest) {
  const loaded = await loadOwnedEntryDoc({ session, lookup: lookupKeyOrId, includeTest });
  if ("error" in loaded && loaded.error) return /** @type {const} */ ({ error: loaded.error, status: loaded.status ?? 400 });

  if (!("doc" in loaded)) return /** @type {const} */ ({ error: "Ikke fundet", status: 404 });

  /** @type {Record<string, unknown>} */
  const mineClause =
    typeof loaded.mineClause === "object" && loaded.mineClause ?
      /** @type {Record<string, unknown>} */ (loaded.mineClause)
    : {};

  const prev = loaded.doc ?? {};
  const scope = loaded.scope ?? {};

  const mongoId =
    prev._id && mongoose.Types.ObjectId.isValid(String(prev._id)) ?
      /** @type {mongoose.Types.ObjectId} */ (prev._id)
    : null;
  if (!mongoId) return /** @type {const} */ ({ error: "Mangelfuld post", status: 500 });

  const res = /** @type {Record<string, unknown> | null} */ (
    await TimeEntry.findOneAndDelete(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, mineClause, /** @type {Record<string, unknown>} */ ({ _id: mongoId }))
      ),
    ).lean()
  );

  if (!res?.["_id"]) return /** @type {const} */ ({ error: "Kunne ikke slette", status: 500 });
  return /** @type {const} */ ({ ok: true });
}
