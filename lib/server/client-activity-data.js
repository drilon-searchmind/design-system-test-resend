import Client from "@/lib/db/models/client";
import ClientDomain from "@/lib/db/models/client-domain";
import Contact from "@/lib/db/models/contact";
import Contract from "@/lib/db/models/contract";
import Note from "@/lib/db/models/note";
import NpsResponse from "@/lib/db/models/nps-response";
import Task from "@/lib/db/models/task";
import TaskComment from "@/lib/db/models/task-comment";
import TimeEntry from "@/lib/db/models/time-entry";
import Upsell from "@/lib/db/models/upsell";
import { connectDb } from "@/lib/db/mongoose";
import { resolveClientDomain } from "@/lib/crm/client-domain";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** Opdateringer inden for dette vindue regnes som "samme hændelse" (fx import, oprettelse). */
const SAME_EVENT_MS = 2 * 60 * 1000;

const CONTRACT_STATUS_DA = /** @type {Record<string, string>} */ ({
  draft: "kladde",
  pending_signature: "sendt til underskrift",
  active: "aktiv",
  paused: "sat på pause",
  notice: "opsagt",
  ended: "udløbet",
});

/** @param {unknown} d */
function toDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @param {unknown} a @param {unknown} b */
function sameEvent(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  return Boolean(da && db && Math.abs(da.getTime() - db.getTime()) < SAME_EVENT_MS);
}

/** @param {unknown} s @param {number} [max] */
function excerpt(s, max = 60) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Seneste dokument pr. kunde i én aggregation (`$sort` + `$group`/`$first`).
 * @param {import('mongoose').Model<any>} model
 * @param {import('mongoose').Types.ObjectId[]} clientIds
 * @param {string} dateField
 * @param {Record<string, 1>} fields
 * @param {Record<string, unknown>[]} [prefix] ekstra stages før sortering (fx beregnet dato)
 */
function latestPerClient(model, clientIds, dateField, fields, prefix = []) {
  /** @type {Record<string, unknown>} */
  const group = { _id: "$clientId", at: { $first: `$${dateField}` } };
  for (const f of Object.keys(fields)) group[f] = { $first: `$${f}` };
  return model
    .aggregate([
      { $match: { clientId: { $in: clientIds } } },
      ...prefix,
      { $match: { [dateField]: { $ne: null } } },
      { $sort: { [dateField]: -1 } },
      { $group: group },
    ])
    .exec();
}

/**
 * ClickUp-import sætter `updatedAt` til importtidspunktet — brug i så fald opgavens egne datoer.
 * @type {Record<string, unknown>[]}
 */
const TASK_ACTIVITY_STAGES = [
  {
    $addFields: {
      importTouch: {
        $and: [
          { $ifNull: ["$clickUpImportedAt", false] },
          { $lt: [{ $abs: { $subtract: ["$updatedAt", "$clickUpImportedAt"] } }, SAME_EVENT_MS] },
        ],
      },
    },
  },
  {
    $addFields: {
      activityAt: {
        $cond: ["$importTouch", { $max: ["$completedAt", "$clickUpCreatedAt"] }, "$updatedAt"],
      },
    },
  },
];

/**
 * @param {Record<string, unknown>} row
 * @returns {import('@/lib/crm/client-activity').ClientActivity | null}
 */
function taskActivity(row) {
  const at = toDate(row.at);
  if (!at) return null;
  const title = excerpt(row.title, 56);
  const done = row.status === "done" || row.status === "cancelled";
  let verb = "Opgave opdateret";
  if (done && sameEvent(row.completedAt, at)) verb = "Opgave afsluttet";
  else if (sameEvent(row.createdAt, at) || sameEvent(row.clickUpCreatedAt, at)) verb = "Opgave oprettet";
  return { at: at.toISOString(), kind: "task", label: `${verb}: ${title}` };
}

/**
 * Seneste aktivitet af enhver art pr. kunde: opgaver, kommentarer, tid, noter, kontrakter,
 * opsalg, NPS-svar, kontakter og ændringer i aftalebeløb. Én aggregation pr. collection, parallelt.
 *
 * @param {Array<{ _id: import('mongoose').Types.ObjectId; commercialLog?: Array<{ at?: Date; note?: string }> }>} clientDocs
 * @returns {Promise<Map<string, import('@/lib/crm/client-activity').ClientActivity>>} nøgle = Mongo `_id` som string
 */
export async function fetchLatestActivityByClientId(clientDocs) {
  const ids = clientDocs.map((c) => c._id);
  /** @type {Map<string, import('@/lib/crm/client-activity').ClientActivity>} */
  const best = new Map();
  if (!ids.length) return best;

  /** @param {unknown} clientId @param {import('@/lib/crm/client-activity').ClientActivity | null} activity */
  const offer = (clientId, activity) => {
    if (!activity) return;
    const key = String(clientId);
    const prev = best.get(key);
    if (!prev || activity.at > prev.at) best.set(key, activity);
  };

  const [tasks, comments, entries, notes, contracts, upsells, nps, contacts] = await Promise.all([
    latestPerClient(
      Task,
      ids,
      "activityAt",
      { title: 1, status: 1, createdAt: 1, completedAt: 1, clickUpCreatedAt: 1 },
      TASK_ACTIVITY_STAGES,
    ),
    latestPerClient(TaskComment, ids, "createdAt", { taskId: 1, bodyText: 1 }),
    latestPerClient(TimeEntry, ids, "createdAt", { durationMinutes: 1, description: 1, taskId: 1 }),
    latestPerClient(Note, ids, "occurredAt", { type: 1, body: 1 }),
    latestPerClient(Contract, ids, "updatedAt", { status: 1, signedAt: 1, label: 1 }),
    latestPerClient(Upsell, ids, "createdAt", { description: 1 }),
    latestPerClient(NpsResponse, ids, "respondedAt", { score: 1 }),
    latestPerClient(Contact, ids, "updatedAt", { name: 1, createdAt: 1 }),
  ]);

  const taskIds = [
    ...new Set(
      [...comments, ...entries].map((r) => (r.taskId ? String(r.taskId) : "")).filter(Boolean),
    ),
  ];
  const taskTitleById = new Map(
    taskIds.length ?
      (await Task.find({ _id: { $in: taskIds } }).select("title").lean()).map((t) => [String(t._id), String(t.title ?? "")])
    : [],
  );

  for (const r of tasks) offer(r._id, taskActivity(r));
  for (const r of comments) {
    const at = toDate(r.at);
    const title = taskTitleById.get(String(r.taskId ?? ""));
    if (at) {
      offer(r._id, {
        at: at.toISOString(),
        kind: "comment",
        label: title ? `Kommentar på ${excerpt(title, 48)}` : `Kommentar: ${excerpt(r.bodyText, 48)}`,
      });
    }
  }
  for (const r of entries) {
    const at = toDate(r.at);
    if (!at) continue;
    const hours = (Number(r.durationMinutes) || 0) / 60;
    const title = taskTitleById.get(String(r.taskId ?? "")) || excerpt(r.description, 40);
    const amount = hours.toLocaleString("da-DK", { maximumFractionDigits: 1 });
    offer(r._id, { at: at.toISOString(), kind: "time", label: `${amount} t registreret${title ? ` på ${title}` : ""}` });
  }
  for (const r of notes) {
    const at = toDate(r.at);
    if (at) offer(r._id, { at: at.toISOString(), kind: "note", label: excerpt(r.body, 60) });
  }
  for (const r of contracts) {
    const at = toDate(r.at);
    if (!at) continue;
    const label =
      sameEvent(r.signedAt, at) ? "Kontrakt underskrevet"
      : `Kontrakt ${CONTRACT_STATUS_DA[String(r.status)] ?? "opdateret"}`;
    offer(r._id, { at: at.toISOString(), kind: "contract", label: r.label ? `${label} (${r.label})` : label });
  }
  for (const r of upsells) {
    const at = toDate(r.at);
    if (at) offer(r._id, { at: at.toISOString(), kind: "upsell", label: `Opsalg registreret: ${excerpt(r.description, 48)}` });
  }
  for (const r of nps) {
    const at = toDate(r.at);
    if (at) offer(r._id, { at: at.toISOString(), kind: "nps", label: `NPS-svar: ${Number(r.score)}/10` });
  }
  for (const r of contacts) {
    const at = toDate(r.at);
    if (!at) continue;
    const verb = sameEvent(r.createdAt, at) ? "Kontakt oprettet" : "Kontakt opdateret";
    offer(r._id, { at: at.toISOString(), kind: "contact", label: `${verb}: ${excerpt(r.name, 40)}` });
  }
  for (const c of clientDocs) {
    const log = Array.isArray(c.commercialLog) ? c.commercialLog : [];
    const last = log[log.length - 1];
    const at = toDate(last?.at);
    if (at) {
      offer(c._id, {
        at: at.toISOString(),
        kind: "commercial",
        label: last?.note ? `Aftalebeløb ændret: ${excerpt(last.note, 48)}` : "Aftalebeløb ændret",
      });
    }
  }

  return best;
}

/**
 * Supplerende felter til kundelisten (`/clients`): seneste aktivitet + primært domæne (favicon).
 * @param {{ includeTest?: boolean }} opts
 * @returns {Promise<{ bySlug: Record<string, { activity: import('@/lib/crm/client-activity').ClientActivity | null; primaryDomain: string }> }>}
 */
export async function fetchClientDirectoryMeta(opts = {}) {
  await connectDb();
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  const clientDocs = await Client.find(scope).select("_id slug clickUpTaskName commercialLog").lean();
  const ids = clientDocs.map((c) => c._id);

  const [activityById, domainRows] = await Promise.all([
    fetchLatestActivityByClientId(/** @type {any[]} */ (clientDocs)),
    ClientDomain.aggregate([
      { $match: { clientId: { $in: ids } } },
      { $sort: { isPrimary: -1, domain: 1 } },
      { $group: { _id: "$clientId", domain: { $first: "$domain" }, isPrimary: { $first: "$isPrimary" } } },
    ]).exec(),
  ]);
  const domainById = new Map(domainRows.map((r) => [String(r._id), r]));

  /** @type {Record<string, { activity: import('@/lib/crm/client-activity').ClientActivity | null; primaryDomain: string }>} */
  const bySlug = {};
  for (const c of clientDocs) {
    const id = String(c._id);
    const dom = domainById.get(id);
    bySlug[String(c.slug ?? id)] = {
      activity: activityById.get(id) ?? null,
      primaryDomain: resolveClientDomain({
        domains: dom ? [{ domain: String(dom.domain ?? ""), isPrimary: Boolean(dom.isPrimary) }] : [],
        clickUpTaskName: typeof c.clickUpTaskName === "string" ? c.clickUpTaskName : null,
      }),
    };
  }
  return { bySlug };
}
