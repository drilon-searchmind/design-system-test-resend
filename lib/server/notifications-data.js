import mongoose from "mongoose";

import Notification from "@/lib/db/models/notification";
import TeamMember from "@/lib/db/models/team-member";
import { taskCommentHref, taskDetailHref } from "@/lib/crm/comment-html";
import { connectDb } from "@/lib/db/mongoose";
import { mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { enrichMembersWithUserImages, userImageByUserId } from "@/lib/server/member-user-images";
import { resolveTaskActorFromSession, resolveUserIdForMemberKey } from "@/lib/server/task-actor";
import { resolveMongoUserIdFromSession } from "@/lib/server/time-entries-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { parseNotificationContextTitle } from "@/lib/crm/notification-display";

/**
 * @param {{
 *   userId: import('mongoose').Types.ObjectId;
 *   type: 'task_assigned' | 'task_mention';
 *   title: string;
 *   body?: string;
 *   href: string;
 *   taskId?: import('mongoose').Types.ObjectId | string;
 *   commentId?: import('mongoose').Types.ObjectId | string;
 *   actorUserId?: import('mongoose').Types.ObjectId | null;
 *   actorMemberKey?: string;
 *   actorDisplayName?: string;
 *   contextTitle?: string;
 *   recipientMemberKey?: string;
 *   isTest?: boolean;
 * }} payload
 */
export async function createNotification(payload) {
  await connectDb();
  /** @type {Record<string, unknown>} */
  const doc = {
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: typeof payload.body === "string" ? payload.body : "",
    href: payload.href,
  };
  if (payload.taskId) doc.taskId = payload.taskId;
  if (payload.commentId) doc.commentId = payload.commentId;
  if (payload.actorUserId) doc.actorUserId = payload.actorUserId;
  if (payload.actorMemberKey) doc.actorMemberKey = payload.actorMemberKey;
  if (payload.actorDisplayName) doc.actorDisplayName = payload.actorDisplayName;
  if (payload.contextTitle) doc.contextTitle = payload.contextTitle;
  if (payload.recipientMemberKey) doc.recipientMemberKey = payload.recipientMemberKey;
  if (payload.isTest) doc.isTest = true;
  await Notification.create(doc);
}

/**
 * @param {{
 *   taskId: string;
 *   taskTitle: string;
 *   assigneeMemberKey: string;
 *   actor: import('@/lib/server/task-actor').TaskActor;
 *   scope: Record<string, unknown>;
 *   isTest?: boolean;
 * }} opts
 */
export async function notifyTaskAssigned(opts) {
  const { userId } = await resolveUserIdForMemberKey(opts.assigneeMemberKey, opts.scope);
  if (!userId) return;

  const actorLabel = opts.actor.userName || "Nogen";
  await createNotification({
    userId,
    type: "task_assigned",
    title: "Ny opgave tildelt",
    body: `${actorLabel} tildelte dig ${opts.taskTitle}.`,
    href: taskDetailHref(opts.taskId),
    taskId: opts.taskId,
    actorUserId: opts.actor.userId,
    actorMemberKey: opts.actor.memberKey || undefined,
    actorDisplayName: actorLabel,
    contextTitle: opts.taskTitle,
    recipientMemberKey: opts.assigneeMemberKey,
    isTest: opts.isTest,
  });
}

/**
 * @param {{
 *   taskId: string;
 *   taskTitle: string;
 *   commentId: string;
 *   mentionedMemberKeys: string[];
 *   actor: import('@/lib/server/task-actor').TaskActor;
 *   scope: Record<string, unknown>;
 *   isTest?: boolean;
 * }} opts
 */
export async function notifyTaskMentions(opts) {
  const unique = [...new Set(opts.mentionedMemberKeys.map((k) => k.trim()).filter(Boolean))];
  if (!unique.length) return;

  const actorLabel = opts.actor.userName || "Nogen";
  const href = taskCommentHref(opts.taskId, opts.commentId);

  for (const memberKey of unique) {
    const { userId } = await resolveUserIdForMemberKey(memberKey, opts.scope);
    if (!userId) continue;

    await createNotification({
      userId,
      type: "task_mention",
      title: "Du blev nævnt i en kommentar",
      body: `${actorLabel} nævnte dig på ${opts.taskTitle}.`,
      href,
      taskId: opts.taskId,
      commentId: opts.commentId,
      actorUserId: opts.actor.userId,
      actorMemberKey: opts.actor.memberKey || undefined,
      actorDisplayName: actorLabel,
      contextTitle: opts.taskTitle,
      recipientMemberKey: memberKey,
      isTest: opts.isTest,
    });
  }
}

/**
 * @param {import('next-auth').Session} session
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function buildNotificationRecipientFilter(session) {
  await connectDb();
  const userId = await resolveMongoUserIdFromSession(session);
  const actor = await resolveTaskActorFromSession(session);
  const memberKey = actor.memberKey?.trim() ?? "";

  /** @type {Set<string>} */
  const userIds = new Set();
  if (userId) userIds.add(String(userId));

  if (memberKey) {
    const tm = await TeamMember.findOne({ key: memberKey }).select("userId").lean();
    if (tm?.userId) userIds.add(String(tm.userId));
  }

  /** @type {Record<string, unknown>[]} */
  const recipientOr = [];
  const oidList = [...userIds]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (oidList.length === 1) recipientOr.push({ userId: oidList[0] });
  else if (oidList.length > 1) recipientOr.push({ userId: { $in: oidList } });

  if (memberKey) recipientOr.push({ recipientMemberKey: memberKey });

  if (!recipientOr.length) return null;
  return recipientOr.length === 1 ? recipientOr[0] : { $or: recipientOr };
}

/**
 * @param {import('next-auth').Session} session
 * @param {{ includeTest?: boolean; limit?: number }} [opts]
 */
export async function fetchNotificationsForSession(session, opts = {}) {
  const recipientFilter = await buildNotificationRecipientFilter(session);
  if (!recipientFilter) {
    return { unreadCount: 0, items: [] };
  }

  return fetchNotificationsForRecipient(recipientFilter, opts);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
async function enrichNotificationRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const memberKeys = [
    ...new Set(
      list
        .map((n) => (typeof n.actorMemberKey === "string" ? n.actorMemberKey.trim() : ""))
        .filter(Boolean),
    ),
  ];

  /** @type {Record<string, ReturnType<typeof mapTeamMemberFromMongo>>} */
  const actorByKey = {};
  if (memberKeys.length) {
    const memberDocs = await TeamMember.find({ key: { $in: memberKeys } }).lean();
    const enriched = await enrichMembersWithUserImages(Array.isArray(memberDocs) ? memberDocs : []);
    for (const doc of enriched) {
      const key = typeof doc.key === "string" ? doc.key.trim() : "";
      if (key) actorByKey[key] = mapTeamMemberFromMongo(doc);
    }
  }

  /** @type {Record<string, string | null>} */
  const imageByUserId = {};
  for (const n of list) {
    const uid = n.actorUserId != null ? String(n.actorUserId) : "";
    if (!uid || uid in imageByUserId) continue;
    imageByUserId[uid] = await userImageByUserId(uid);
  }

  return list.map((n) => {
    const mk = typeof n.actorMemberKey === "string" ? n.actorMemberKey.trim() : "";
    const storedActorName = typeof n.actorDisplayName === "string" ? n.actorDisplayName.trim() : "";
    const storedContextTitle = typeof n.contextTitle === "string" ? n.contextTitle.trim() : "";
    const body = String(n.body ?? "");
    const contextTitle = storedContextTitle || parseNotificationContextTitle(body);

    let actor = mk && actorByKey[mk] ? { ...actorByKey[mk] } : null;
    const uid = n.actorUserId != null ? String(n.actorUserId) : "";
    const userImage = uid ? imageByUserId[uid] : null;
    if (userImage) {
      actor = actor ? { ...actor, image: userImage } : {
        id: mk || uid,
        name: storedActorName || "Nogen",
        role: "",
        dept: "",
        disciplineKeys: [],
        avatar: storedActorName.slice(0, 2).toUpperCase() || "?",
        hue: 220,
        weeklyHours: 37,
        userAccountId: uid ? `u-${uid}` : null,
        image: userImage,
      };
    } else if (!actor && storedActorName) {
      actor = {
        id: mk || uid || "actor",
        name: storedActorName,
        role: "",
        dept: "",
        disciplineKeys: [],
        avatar: storedActorName.slice(0, 2).toUpperCase() || "?",
        hue: 220,
        weeklyHours: 37,
        userAccountId: uid ? `u-${uid}` : null,
      };
    }

    return {
      id: n._id != null ? String(n._id) : "",
      type: String(n.type ?? ""),
      title: String(n.title ?? ""),
      body,
      href: String(n.href ?? ""),
      taskId: n.taskId != null ? String(n.taskId) : "",
      commentId: n.commentId != null ? String(n.commentId) : "",
      readAt: n.readAt ? new Date(String(n.readAt)).toISOString() : null,
      createdAt: n.createdAt ? new Date(String(n.createdAt)).toISOString() : "",
      actorDisplayName: storedActorName,
      contextTitle,
      actor,
    };
  });
}

/**
 * @param {Record<string, unknown>} recipientFilter
 * @param {{ includeTest?: boolean; limit?: number }} [opts]
 */
async function fetchNotificationsForRecipient(recipientFilter, opts = {}) {
  await connectDb();
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  const limit = typeof opts.limit === "number" && opts.limit > 0 ? Math.min(opts.limit, 200) : 30;

  const baseFilter = { $and: [scope, recipientFilter] };

  const rows = await Notification.find(baseFilter).sort({ createdAt: -1 }).limit(limit).lean();

  const unread = await Notification.countDocuments({
    $and: [scope, recipientFilter, { readAt: null }],
  }).exec();

  const items = await enrichNotificationRows(Array.isArray(rows) ? rows : []);

  return { unreadCount: unread, items };
}

/**
 * @param {import('next-auth').Session} session
 */
async function notificationRecipientFilter(session) {
  return buildNotificationRecipientFilter(session);
}

/**
 * @param {string} notificationId
 * @param {import('next-auth').Session} session
 */
export async function markNotificationRead(notificationId, session) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return { error: "Ugyldigt id", status: 400 };
  }

  const recipientFilter = await notificationRecipientFilter(session);
  if (!recipientFilter) return { error: "Unauthorized", status: 401 };

  await connectDb();
  const res = await Notification.updateOne(
    {
      $and: [{ _id: new mongoose.Types.ObjectId(notificationId), readAt: null }, recipientFilter],
    },
    { $set: { readAt: new Date() } },
  ).exec();
  if ((res.modifiedCount ?? 0) < 1) return { error: "Ikke fundet", status: 404 };
  return { ok: /** @type {const} */ (true) };
}

/**
 * @param {import('next-auth').Session} session
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function markAllNotificationsRead(session, opts = {}) {
  const recipientFilter = await notificationRecipientFilter(session);
  if (!recipientFilter) return { error: "Unauthorized", status: 401 };

  await connectDb();
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  await Notification.updateMany(
    { $and: [scope, recipientFilter, { readAt: null }] },
    { $set: { readAt: new Date() } },
  ).exec();
  return { ok: /** @type {const} */ (true) };
}
