import mongoose from "mongoose";

import Task from "@/lib/db/models/task";
import TaskComment from "@/lib/db/models/task-comment";
import TeamMember from "@/lib/db/models/team-member";
import {
  commentHtmlToPlainText,
  extractMentionedMemberKeys,
  sanitizeCommentHtml,
} from "@/lib/crm/comment-html";
import { contractToIsoDateOnly, mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { connectDb } from "@/lib/db/mongoose";
import { notifyTaskMentions } from "@/lib/server/notifications-data";
import { resolveTaskActorFromSession } from "@/lib/server/task-actor";
import { userImageByUserId } from "@/lib/server/member-user-images";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {string} taskId
 * @param {boolean} includeTest
 */
export async function fetchTaskComments(taskId, includeTest) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return { error: "Ugyldigt opgave-id", status: 400 };
  }

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const taskOid = new mongoose.Types.ObjectId(taskId);

  const task = await Task.findOne(
    andQuery(/** @type {Record<string, unknown>} */ (scope), { _id: taskOid }),
  )
    .select("_id")
    .lean();
  if (!task) return { error: "Opgave ikke fundet", status: 404 };

  const rows = await TaskComment.find(andQuery(/** @type {Record<string, unknown>} */ (scope), { taskId: taskOid }))
    .sort({ createdAt: 1 })
    .lean();

  const memberKeys = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    const mk = typeof r.authorMemberKey === "string" ? r.authorMemberKey.trim() : "";
    if (mk) memberKeys.add(mk);
  }

  /** @type {Record<string, Record<string, unknown>>} */
  const authorByKey = {};
  if (memberKeys.size) {
    const memDocs = await TeamMember.find({
      ...scope,
      key: { $in: [...memberKeys] },
    }).lean();
    for (const m of Array.isArray(memDocs) ? memDocs : []) {
      const key = typeof m.key === "string" ? m.key.trim() : "";
      if (key) authorByKey[key] = /** @type {Record<string, unknown>} */ (m);
    }
  }

  /** @type {Array<Record<string, unknown>>} */
  const comments = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const mk = typeof r.authorMemberKey === "string" ? r.authorMemberKey.trim() : "";
    const memDoc = mk ? authorByKey[mk] : null;
    let author = null;
    if (memDoc) {
      const uid = memDoc.userId != null ? String(memDoc.userId) : "";
      const img = uid ? await userImageByUserId(uid) : null;
      author = mapTeamMemberFromMongo(img ? { ...memDoc, image: img } : memDoc);
    }

    comments.push({
      id: r._id != null ? String(r._id) : "",
      bodyHtml: typeof r.bodyHtml === "string" ? r.bodyHtml : "",
      bodyText: typeof r.bodyText === "string" ? r.bodyText : "",
      mentionedMemberKeys: Array.isArray(r.mentionedMemberKeys) ? r.mentionedMemberKeys.map(String) : [],
      createdAt: contractToIsoDateOnly(r.createdAt) || "",
      createdAtIso: r.createdAt ? new Date(String(r.createdAt)).toISOString() : "",
      author,
      authorMemberKey: mk,
    });
  }

  return { comments };
}

/**
 * @param {import('next-auth').Session} session
 * @param {string} taskId
 * @param {boolean} includeTest
 * @param {{ bodyHtml: string }} body
 */
export async function createTaskComment(session, taskId, includeTest, body) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return { error: "Ugyldigt opgave-id", status: 400 };
  }

  const actor = await resolveTaskActorFromSession(session);
  if (!actor.userId) return { error: "Unauthorized", status: 401 };

  const html = sanitizeCommentHtml(body.bodyHtml);
  if (!html.trim()) return { error: "Kommentar må ikke være tom", status: 400 };

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));
  const taskOid = new mongoose.Types.ObjectId(taskId);

  const task = await Task.findOne(andQuery(scope, { _id: taskOid })).lean();
  if (!task?.clientId) return { error: "Opgave ikke fundet", status: 404 };

  const mentionedMemberKeys = extractMentionedMemberKeys(html);
  const plain = commentHtmlToPlainText(html);

  /** @type {Record<string, unknown>} */
  const doc = {
    taskId: taskOid,
    clientId: task.clientId,
    authorUserId: actor.userId,
    authorMemberKey: actor.memberKey || undefined,
    authorMemberId: actor.memberId || undefined,
    bodyHtml: html,
    bodyText: plain,
    mentionedMemberKeys,
  };
  if (includeTest) doc.isTest = true;

  const inserted = await TaskComment.create(doc);
  const commentId = inserted._id != null ? String(inserted._id) : "";
  const taskTitle = typeof task.title === "string" ? task.title : "Opgave";

  if (mentionedMemberKeys.length) {
    await notifyTaskMentions({
      taskId,
      taskTitle,
      commentId,
      mentionedMemberKeys,
      actor,
      scope,
      isTest: includeTest,
    });
  }

  const wire = await fetchTaskComments(taskId, includeTest);
  if ("error" in wire) return wire;

  const created =
    wire.comments?.find((c) => c.id === commentId) ??
    wire.comments?.[wire.comments.length - 1] ??
    null;

  return { ok: /** @type {const} */ (true), comment: created, comments: wire.comments };
}
