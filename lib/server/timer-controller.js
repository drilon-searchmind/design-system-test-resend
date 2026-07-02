import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import TimerSession from "@/lib/db/models/timer-session";
import { connectDb } from "@/lib/db/mongoose";
import {
  fetchTimeEntryPicklistsForProduction,
  resolveMongoUserIdFromSession,
} from "@/lib/server/time-entries-data";
import {
  memberDefaultDepartmentKey,
  resolveTimeEntryDepartmentKey,
} from "@/lib/server/resolve-time-entry-department";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 */
async function enrichSession(doc) {
  if (!doc) return null;

  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));
  const slug = typeof doc.clientSlug === "string" ? doc.clientSlug.trim() : "";
  let clientName = slug;
  if (slug) {
    const clientDoc = await Client.findOne(andQuery(scope, { slug })).select("name").lean();
    if (clientDoc?.name) clientName = String(clientDoc.name);
  }

  let taskTitle = null;
  const taskRef =
    doc.taskId != null ? String(doc.taskId)
    : typeof doc.taskKey === "string" && doc.taskKey.trim() ? doc.taskKey.trim()
    : "";
  if (taskRef && mongoose.Types.ObjectId.isValid(taskRef)) {
    const taskDoc = await Task.findOne(
      andQuery(scope, { _id: new mongoose.Types.ObjectId(taskRef) }),
    )
      .select("title")
      .lean();
    if (taskDoc?.title) taskTitle = String(taskDoc.title);
  }

  return {
    ...doc,
    clientName,
    taskTitle,
  };
}

export async function getTimerForSession(session) {
  const picklists = await fetchTimeEntryPicklistsForProduction();

  if (!session?.user) {
    return { active: null, ...picklists, canStartTimer: false };
  }

  const userId = await resolveMongoUserIdFromSession(session);
  if (!userId) {
    return { active: null, ...picklists, canStartTimer: false };
  }

  await connectDb();
  const tm = /** @type {{ departmentKey?: string; disciplineKeys?: string[] } | null} */ (
    await TeamMember.findOne({ userId }).select("departmentKey disciplineKeys").lean()
  );
  const defaultDepartmentKey = memberDefaultDepartmentKey(tm);

  const doc = await TimerSession.findOne({ userId }).lean();
  return {
    active: await enrichSession(doc),
    canStartTimer: true,
    defaultDepartmentKey: defaultDepartmentKey ?? undefined,
    ...picklists,
  };
}

export async function startTimer(session, body) {
  const userId = await resolveMongoUserIdFromSession(session);
  if (!userId) return { error: "Unauthorized", status: 401 };

  const clientSlug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : "";
  if (!clientSlug) return { error: "Vælg kunde", status: 400 };

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));

  const clientDoc = await Client.findOne(andQuery(scope, { slug: clientSlug })).select("_id name").lean();
  if (!clientDoc?._id) return { error: "Ukendt kunde", status: 400 };

  const taskKey = typeof body.taskKey === "string" && body.taskKey.trim() ? body.taskKey.trim() : "";
  let taskOid;
  let taskDocWithDept = null;
  if (taskKey) {
    if (!mongoose.Types.ObjectId.isValid(taskKey)) {
      return { error: "Ukendt opgave", status: 400 };
    }
    taskDocWithDept = await Task.findOne(
      andQuery(scope, { _id: new mongoose.Types.ObjectId(taskKey) }),
    )
      .select("_id clientSlug departmentKey")
      .lean();
    if (!taskDocWithDept?._id) return { error: "Ukendt opgave", status: 400 };
    const tcs = typeof taskDocWithDept.clientSlug === "string" ? taskDocWithDept.clientSlug.trim() : "";
    if (tcs && tcs !== clientSlug) {
      return { error: "Opgave passer ikke til valgt kunde", status: 400 };
    }
    taskOid = taskDocWithDept._id;
  }

  const tm = /** @type {{ _id?: mongoose.Types.ObjectId; departmentKey?: string; disciplineKeys?: string[] } | null} */ (
    await TeamMember.findOne({ userId }).select("_id departmentKey disciplineKeys").lean()
  );

  const description = typeof body.description === "string" ? body.description : "";
  const billable = body.billable !== false;
  const explicitDept = typeof body.departmentKey === "string" ? body.departmentKey.trim() : "";
  const resolvedDept =
    (await resolveTimeEntryDepartmentKey({
      explicitKey: explicitDept,
      taskOid,
      taskDoc: taskDocWithDept,
      memberDoc: tm,
      scope,
    })) || undefined;

  const doc = await TimerSession.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        teamMemberId: tm?._id,
        clientSlug,
        clientId: clientDoc._id,
        taskKey: taskOid ? String(taskOid) : undefined,
        taskId: taskOid,
        description,
        billable,
        departmentKey: resolvedDept,
        startedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return { active: await enrichSession(doc) };
}

export async function stopTimer(session) {
  const userId = await resolveMongoUserIdFromSession(session);
  if (!userId) return { error: "Unauthorized", status: 401 };

  await connectDb();
  const doc = await TimerSession.findOne({ userId }).lean();
  if (!doc) return { error: "Ingen aktiv timer", status: 400 };

  const ms = Date.now() - new Date(doc.startedAt).getTime();
  const durationMinutes = Math.max(1, Math.round(ms / 60000));

  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));
  let departmentKey = typeof doc.departmentKey === "string" ? doc.departmentKey.trim() : "";
  if (!departmentKey) {
    const tm = /** @type {{ departmentKey?: string; disciplineKeys?: string[] } | null} */ (
      await TeamMember.findOne({ userId }).select("departmentKey disciplineKeys").lean()
    );
    departmentKey =
      (await resolveTimeEntryDepartmentKey({
        taskOid: doc.taskId ? /** @type {mongoose.Types.ObjectId} */ (doc.taskId) : undefined,
        memberDoc: tm,
        scope,
      })) || "";
  }

  await TimeEntry.create({
    userId,
    teamMemberId: doc.teamMemberId,
    clientSlug: doc.clientSlug,
    clientId: doc.clientId,
    departmentKey: departmentKey || undefined,
    taskKey: doc.taskKey,
    taskId: doc.taskId,
    durationMinutes,
    description: doc.description,
    workedAt: new Date(),
    billable: doc.billable ?? true,
    source: "timer",
    timerStartedAt: doc.startedAt,
  });

  await TimerSession.deleteOne({ userId });
  return { ok: true, durationMinutes };
}
