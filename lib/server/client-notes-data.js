import mongoose from "mongoose";

import { sessionUserIsAdmin } from "@/lib/auth/session-admin";
import { NOTE_BODY_MAX, NOTE_TYPE_OPTIONS } from "@/lib/crm/client-notes";
import Client from "@/lib/db/models/client";
import Note from "@/lib/db/models/note";
import Task from "@/lib/db/models/task";
import TaskComment from "@/lib/db/models/task-comment";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @param {unknown} d */
function toDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @param {Date | null} d */
function formatDa(d) {
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/**
 * @param {string} clientKey slug eller Mongo-id
 * @param {boolean} includeTest
 */
export async function findClientForNotes(clientKey, includeTest) {
  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  /** @type {Record<string, unknown>[]} */
  const slugOrId = [{ slug: clientKey }];
  if (mongoose.Types.ObjectId.isValid(clientKey)) {
    slugOrId.push({ _id: new mongoose.Types.ObjectId(clientKey) });
  }
  return Client.findOne(andQuery({ $or: slugOrId }, /** @type {Record<string, unknown>} */ (scope)))
    .select("_id slug name")
    .lean();
}

/**
 * Noter + opgavekommentarer for én kunde, nyeste først.
 * @param {import('mongoose').Types.ObjectId} clientId
 * @param {{ limit?: number; includeTest?: boolean }} [opts]
 * @returns {Promise<import('@/lib/crm/client-notes').ClientNoteItem[]>}
 */
export async function fetchClientNoteFeed(clientId, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 25, 1), 500);
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");

  const [notes, comments] = await Promise.all([
    Note.find({ clientId }).sort({ occurredAt: -1 }).limit(limit).lean(),
    TaskComment.find(andQuery({ clientId }, /** @type {Record<string, unknown>} */ (scope)))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("taskId authorMemberKey bodyText createdAt")
      .lean(),
  ]);

  const taskIds = new Set();
  const memberKeys = new Set();
  for (const n of notes) {
    if (n.taskId) taskIds.add(String(n.taskId));
    if (n.authorMemberKey) memberKeys.add(String(n.authorMemberKey));
  }
  for (const c of comments) {
    if (c.taskId) taskIds.add(String(c.taskId));
    if (c.authorMemberKey) memberKeys.add(String(c.authorMemberKey));
  }

  const [taskDocs, memberDocs] = await Promise.all([
    taskIds.size ? Task.find({ _id: { $in: [...taskIds] } }).select("title").lean() : Promise.resolve([]),
    memberKeys.size ?
      TeamMember.find({ key: { $in: [...memberKeys] } }).select("key name").lean()
    : Promise.resolve([]),
  ]);
  const taskTitle = new Map(taskDocs.map((t) => [String(t._id), String(t.title ?? "")]));
  const memberName = new Map(memberDocs.map((m) => [String(m.key), String(m.name ?? "")]));

  /** @type {import('@/lib/crm/client-notes').ClientNoteItem[]} */
  const items = [];
  for (const n of notes) {
    const d = toDate(n.occurredAt);
    const who = String(n.authorMemberKey ?? "");
    items.push({
      id: String(n._id),
      kind: "note",
      who,
      authorName: memberName.get(who) || (typeof n.authorName === "string" ? n.authorName : "") || undefined,
      authorUserId: n.authorUserId ? String(n.authorUserId) : undefined,
      at: formatDa(d),
      occurredAt: d ? d.toISOString() : undefined,
      type: String(n.type ?? "note"),
      body: String(n.body ?? ""),
      source: typeof n.source === "string" ? n.source : undefined,
      taskId: n.taskId ? String(n.taskId) : undefined,
      taskTitle: n.taskId ? taskTitle.get(String(n.taskId)) || undefined : undefined,
    });
  }
  for (const c of comments) {
    const d = toDate(c.createdAt);
    const who = String(c.authorMemberKey ?? "");
    items.push({
      id: `tc-${String(c._id)}`,
      kind: "task_comment",
      who,
      authorName: memberName.get(who) || undefined,
      at: formatDa(d),
      occurredAt: d ? d.toISOString() : undefined,
      type: "comment",
      body: String(c.bodyText ?? ""),
      taskId: c.taskId ? String(c.taskId) : undefined,
      taskTitle: c.taskId ? taskTitle.get(String(c.taskId)) || undefined : undefined,
    });
  }

  return items
    .sort((a, b) => String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? "")))
    .slice(0, limit);
}

/**
 * Opret manuel note. Forfatter = teammedlem koblet til sessionens bruger (ellers brugerens navn).
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {import('next-auth').Session} session
 * @param {{ body?: unknown; type?: unknown }} input
 */
export async function createClientNote(clientKey, includeTest, session, input) {
  const body = String(input.body ?? "").trim();
  if (!body) return { error: "Noten er tom", status: 400 };
  if (body.length > NOTE_BODY_MAX) return { error: `Noten må højst være ${NOTE_BODY_MAX} tegn`, status: 400 };
  const type = NOTE_TYPE_OPTIONS.some((o) => o.value === input.type) ? String(input.type) : "note";

  const client = await findClientForNotes(clientKey, includeTest);
  if (!client) return { error: "Kunde ikke fundet", status: 404 };

  const uid = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  const userOid = uid && mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : null;
  const member = userOid ? await TeamMember.findOne({ userId: userOid }).select("_id key name").lean() : null;

  const doc = await Note.create({
    clientId: client._id,
    clientSlug: String(client.slug ?? ""),
    authorMemberKey: member?.key ? String(member.key) : undefined,
    authorId: member?._id,
    authorUserId: userOid ?? undefined,
    authorName: String(member?.name ?? session?.user?.name ?? session?.user?.email ?? "").trim() || undefined,
    type,
    source: "manual",
    body,
    occurredAt: new Date(),
  });

  return { ok: /** @type {const} */ (true), id: String(doc._id) };
}

/**
 * Finder en rigtig `Note` på kunden og tjekker at sessionens bruger må ændre den
 * (forfatter eller admin; noter uden forfatter — seed/ClickUp — kun admin).
 * Opgavekommentarer (`tc-…`) er ikke `Note`-dokumenter og afvises som ugyldigt id.
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {import('next-auth').Session} session
 * @param {string} noteId
 */
async function findManageableNote(clientKey, includeTest, session, noteId) {
  if (!mongoose.Types.ObjectId.isValid(noteId)) return { error: "Ugyldigt note-id", status: 400 };

  const [client, isAdmin] = await Promise.all([
    findClientForNotes(clientKey, includeTest),
    sessionUserIsAdmin(session),
  ]);
  if (!client) return { error: "Kunde ikke fundet", status: 404 };

  const note = await Note.findOne({ _id: noteId, clientId: client._id }).select("authorUserId").lean();
  if (!note) return { error: "Noten findes ikke", status: 404 };

  const uid = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  const isAuthor = Boolean(uid && note.authorUserId && String(note.authorUserId) === uid);
  if (!isAuthor && !isAdmin) {
    return { error: "Du kan kun redigere eller slette dine egne noter", status: 403 };
  }
  return { note };
}

/**
 * Ret tekst (og evt. type) på en note.
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {import('next-auth').Session} session
 * @param {string} noteId
 * @param {{ body?: unknown; type?: unknown }} input
 */
export async function updateClientNote(clientKey, includeTest, session, noteId, input) {
  const body = String(input.body ?? "").trim();
  if (!body) return { error: "Noten er tom", status: 400 };
  if (body.length > NOTE_BODY_MAX) return { error: `Noten må højst være ${NOTE_BODY_MAX} tegn`, status: 400 };
  /** @type {{ body: string; type?: string }} */
  const set = { body };
  if (input.type !== undefined) {
    if (!NOTE_TYPE_OPTIONS.some((o) => o.value === input.type)) return { error: "Ugyldig notetype", status: 400 };
    set.type = String(input.type);
  }

  const found = await findManageableNote(clientKey, includeTest, session, noteId);
  if ("error" in found) return found;

  await Note.updateOne({ _id: found.note._id }, { $set: set }).exec();
  return { ok: /** @type {const} */ (true), id: String(found.note._id), body: set.body, type: set.type };
}

/**
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {import('next-auth').Session} session
 * @param {string} noteId
 */
export async function deleteClientNote(clientKey, includeTest, session, noteId) {
  const found = await findManageableNote(clientKey, includeTest, session, noteId);
  if ("error" in found) return found;

  await Note.deleteOne({ _id: found.note._id }).exec();
  return { ok: /** @type {const} */ (true) };
}
