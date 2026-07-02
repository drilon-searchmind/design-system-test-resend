import mongoose from "mongoose";

import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import { resolveMongoUserIdFromSession } from "@/lib/server/time-entries-data";

/**
 * @typedef {{
 *   userId: import('mongoose').Types.ObjectId | null;
 *   memberKey: string;
 *   memberId: import('mongoose').Types.ObjectId | null;
 *   userName: string;
 * }} TaskActor
 */

/**
 * @param {import('next-auth').Session | null | undefined} session
 * @returns {Promise<TaskActor>}
 */
export async function resolveTaskActorFromSession(session) {
  const userName =
    typeof session?.user?.name === "string" && session.user.name.trim() ?
      session.user.name.trim()
    : typeof session?.user?.email === "string" ?
      session.user.email
    : "Bruger";

  const userId = await resolveMongoUserIdFromSession(session);
  if (!userId) {
    return { userId: null, memberKey: "", memberId: null, userName };
  }

  await connectDb();
  const mem = await TeamMember.findOne({ userId }).select("_id key").lean();
  return {
    userId,
    memberKey: mem?.key ? String(mem.key) : "",
    memberId: mem?._id ? /** @type {import('mongoose').Types.ObjectId} */ (mem._id) : null,
    userName,
  };
}

/**
 * @param {string} memberKey
 * @param {Record<string, unknown>} [scope]
 * @returns {Promise<{ userId: import('mongoose').Types.ObjectId | null; memberKey: string }>}
 */
export async function resolveUserIdForMemberKey(memberKey, _scope = {}) {
  const k = String(memberKey ?? "").trim();
  if (!k) return { userId: null, memberKey: "" };

  await connectDb();
  // Resolve by roster key only — isTest scope applies to notification rows, not member lookup.
  const mem = await TeamMember.findOne({ key: k }).select("userId key").lean();
  if (!mem?.userId || !mongoose.Types.ObjectId.isValid(String(mem.userId))) {
    return { userId: null, memberKey: k };
  }
  return {
    userId: /** @type {import('mongoose').Types.ObjectId} */ (mem.userId),
    memberKey: k,
  };
}
