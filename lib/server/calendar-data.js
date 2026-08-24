import mongoose from "mongoose";

import { calendarSlotsFromMongoDoc, realCalendarSlotsFromMongoDoc } from "@/lib/crm/calendar-slots";
import { calendarColorsForTaskStatus, CALENDAR_GOOGLE_EVENT_COLORS } from "@/lib/crm/calendar-task-colors";
import { normalizeSlotRange } from "@/lib/crm/calendar-slots";
import { snapToWeekday } from "@/lib/crm/calendar-task-schedule";
import { taskDueReferenceTodayIso } from "@/lib/crm/task-utils";
import Task from "@/lib/db/models/task";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import { fetchAllTasksForCalendar } from "@/lib/server/calendar-tasks-query";
import { fetchGoogleCalendarEventsWithRefresh } from "@/lib/server/google-calendar";
import { assigneeMemberKeyForDbUser } from "@/lib/server/session-team-member";
import { fetchTasksPortfolio } from "@/lib/server/tasks-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/**
 * @param {string} userId
 */
async function loadUserGoogleToken(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  await connectDb();
  const user = await User.findById(userId)
    .select("googleCalendarRefreshToken googleCalendarConnectedAt")
    .lean();
  if (!user?.googleCalendarRefreshToken) return null;
  return {
    refreshToken: String(user.googleCalendarRefreshToken),
    connectedAt:
      user.googleCalendarConnectedAt instanceof Date ?
        user.googleCalendarConnectedAt.toISOString()
      : null,
  };
}

/**
 * @param {Record<string, unknown>} scope
 * @param {string} taskKeyOrId
 */
async function findTaskForCalendar(taskKeyOrId, scope) {
  await connectDb();
  const key = String(taskKeyOrId ?? "").trim();
  if (!key) return null;

  if (mongoose.Types.ObjectId.isValid(key)) {
    const byId = await Task.findOne({ _id: new mongoose.Types.ObjectId(key), ...scope }).lean();
    if (byId) return byId;
  }

  return Task.findOne({ ...scope, $or: [{ _id: key }, { key }] }).lean();
}

/**
 * @param {import('next-auth').Session | null | undefined} session
 */
function calendarUserIdFromSession(session) {
  const uid = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return "";
  return uid;
}

/**
 * @param {Record<string, unknown>} taskDoc
 * @param {string} [calendarUserId]
 */
async function migrateLegacyScheduleToSlots(taskDoc, calendarUserId) {
  const id = taskDoc._id;
  if (!id) return taskDoc;

  const rawSlots = Array.isArray(taskDoc.calendarSlots) ? taskDoc.calendarSlots : [];
  if (rawSlots.length) return taskDoc;

  const legacyStart = taskDoc.scheduledStart instanceof Date ? taskDoc.scheduledStart : null;
  if (!legacyStart) return taskDoc;

  const legacyEnd =
    taskDoc.scheduledEnd instanceof Date && taskDoc.scheduledEnd > legacyStart
      ? taskDoc.scheduledEnd
      : new Date(legacyStart.getTime() + 60 * 60_000);

  await Task.findByIdAndUpdate(id, {
    $push: {
      calendarSlots: {
        start: legacyStart,
        end: legacyEnd,
        ...(calendarUserId && mongoose.Types.ObjectId.isValid(calendarUserId)
          ? { userId: new mongoose.Types.ObjectId(calendarUserId) }
          : {}),
      },
    },
    $unset: { scheduledStart: 1, scheduledEnd: 1 },
  });

  return Task.findById(id).lean();
}

/**
 * @param {Record<string, unknown>} taskDoc
 * @param {string} slotId
 * @param {number | null | undefined} [slotIndex]
 * @param {string} [calendarUserId]
 */
function resolveSlotMongoId(taskDoc, slotId, slotIndex, calendarUserId) {
  const slots = realCalendarSlotsFromMongoDoc(taskDoc, {
    calendarUserId: calendarUserId || undefined,
  });

  if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < slots.length) {
    const indexed = slots[slotIndex];
    if (indexed && mongoose.Types.ObjectId.isValid(indexed.id)) return indexed.id;
  }

  const sid = String(slotId ?? "").trim();
  if (!sid) return null;

  if (sid === "legacy") {
    if (slots.length) {
      const target = Number.isInteger(slotIndex) ? slots[slotIndex] : slots[0];
      if (target && mongoose.Types.ObjectId.isValid(target.id)) return target.id;
    }
    if (taskDoc.scheduledStart instanceof Date) return "__legacy_fields__";
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(sid)) {
    const exists = slots.some((s) => s.id === sid);
    if (exists) return sid;
  }

  const direct = slots.find((s) => s.id === sid);
  if (direct && mongoose.Types.ObjectId.isValid(direct.id)) return direct.id;

  if (sid.startsWith("slot-")) {
    const startPart = sid.slice(5);
    const matches = slots.filter(
      (s) => s.start === startPart || s.start.slice(0, 16) === startPart.slice(0, 16),
    );
    if (matches.length === 1 && mongoose.Types.ObjectId.isValid(matches[0].id)) return matches[0].id;
    if (Number.isInteger(slotIndex) && matches[slotIndex] && mongoose.Types.ObjectId.isValid(matches[slotIndex].id)) {
      return matches[slotIndex].id;
    }
  }

  if (sid.startsWith("local-")) {
    const idx = Number(sid.split("-")[1]);
    const local = Number.isInteger(idx) ? slots[idx] : null;
    if (local && mongoose.Types.ObjectId.isValid(local.id)) return local.id;
  }

  return null;
}

/**
 * @param {{
 *   includeTest?: boolean;
 *   mineAssigneeKey?: string;
 *   timeMin?: string;
 *   timeMax?: string;
 *   includeGoogle?: boolean;
 *   session?: import('next-auth').Session | null;
 * }} opts
 */
export async function fetchCalendarBundle(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  const includeGoogle = opts.includeGoogle !== false;
  const mineAssigneeKey =
    typeof opts.mineAssigneeKey === "string" ? opts.mineAssigneeKey.trim() : "";
  const session = opts.session ?? null;
  const userId = typeof session?.user?.id === "string" ? session.user.id.trim() : "";

  const portfolio = await fetchTasksPortfolio({
    includeTest,
    mineAssigneeKey,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const allTasks = await fetchAllTasksForCalendar({
    includeTest,
    calendarUserId: userId,
  });

  const googleAvailable = Boolean(env.SSO_GOOGLE_CLIENT_ID && env.SSO_GOOGLE_CLIENT_SECRET);
  /** @type {{ connected: boolean; connectedAt: string | null; available: boolean; error?: string }} */
  let googleCalendar = {
    connected: false,
    connectedAt: null,
    available: googleAvailable,
  };
  /** @type {Array<{ id: string; title: string; start: string; end: string; allDay: boolean; location?: string; htmlLink?: string }>} */
  let googleEvents = [];

  if (googleAvailable && userId) {
    const token = await loadUserGoogleToken(userId);
    if (token) {
      googleCalendar = {
        connected: true,
        connectedAt: token.connectedAt,
        available: true,
      };

      if (includeGoogle) {
        const timeMin = opts.timeMin ? new Date(opts.timeMin) : new Date();
        const timeMax =
          opts.timeMax ? new Date(opts.timeMax) : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
        if (!Number.isNaN(timeMin.getTime()) && !Number.isNaN(timeMax.getTime()) && timeMax > timeMin) {
          try {
            googleEvents = await fetchGoogleCalendarEventsWithRefresh(
              token.refreshToken,
              timeMin,
              timeMax,
            );
          } catch (err) {
            googleCalendar.error = err instanceof Error ? err.message : "Google Calendar fejl";
          }
        }
      }
    }
  }

  return {
    ...portfolio,
    tasks: allTasks.length ? allTasks : portfolio.tasks,
    taskDueReferenceIso: taskDueReferenceTodayIso(),
    googleCalendar,
    googleEvents,
  };
}

/**
 * @param {import('next-auth').Session} session
 */
export async function getGoogleCalendarStatus(session) {
  const userId = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  const available = Boolean(env.SSO_GOOGLE_CLIENT_ID && env.SSO_GOOGLE_CLIENT_SECRET);
  if (!available || !userId) {
    return { connected: false, connectedAt: null, available };
  }
  const token = await loadUserGoogleToken(userId);
  return {
    connected: Boolean(token),
    connectedAt: token?.connectedAt ?? null,
    available,
  };
}

/**
 * @param {import('next-auth').Session} session
 * @param {string} refreshToken
 */
export async function saveGoogleCalendarToken(session, refreshToken) {
  const userId = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Ugyldig bruger");
  }
  const token = String(refreshToken ?? "").trim();
  if (!token) throw new Error("Manglende refresh token");

  await connectDb();
  await User.findByIdAndUpdate(userId, {
    googleCalendarRefreshToken: token,
    googleCalendarConnectedAt: new Date(),
  });
}

/**
 * @param {import('next-auth').Session} session
 */
export async function disconnectGoogleCalendar(session) {
  const userId = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;
  await connectDb();
  await User.findByIdAndUpdate(userId, {
    $unset: { googleCalendarRefreshToken: 1, googleCalendarConnectedAt: 1 },
  });
}

/**
 * @param {Array<{ id: string; title: string; start: string; end: string; allDay: boolean; location?: string; htmlLink?: string }>} events
 */
export function googleEventsToCalendar(events) {
  return events.map((ev) => ({
    id: `google-${ev.id}`,
    title: ev.title,
    start: ev.start,
    end: ev.end,
    allDay: ev.allDay,
    editable: false,
    durationEditable: false,
    startEditable: false,
    backgroundColor: CALENDAR_GOOGLE_EVENT_COLORS.bg,
    borderColor: CALENDAR_GOOGLE_EVENT_COLORS.border,
    textColor: CALENDAR_GOOGLE_EVENT_COLORS.text,
    extendedProps: {
      source: "google",
      location: ev.location ?? "",
      htmlLink: ev.htmlLink ?? "",
      colorBg: CALENDAR_GOOGLE_EVENT_COLORS.bg,
      colorBorder: CALENDAR_GOOGLE_EVENT_COLORS.border,
      colorText: CALENDAR_GOOGLE_EVENT_COLORS.text,
    },
  }));
}

/**
 * @param {string} taskId
 * @param {boolean} includeTest
 * @param {{ start: string; end: string }} range
 * @param {import('next-auth').Session | null | undefined} [session]
 */
export async function createCalendarSlot(taskId, includeTest, range, session = null) {
  const calendarUserId = calendarUserIdFromSession(session);
  if (!calendarUserId) return { error: "Ugyldig bruger", status: 401 };
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const taskDoc = await findTaskForCalendar(taskId, scope);
  if (!taskDoc) return { error: "Opgave ikke fundet", status: 404 };

  let start = snapToWeekday(new Date(String(range.start ?? "")));
  let end = new Date(String(range.end ?? ""));
  const estimateHours =
    typeof taskDoc.estimateHours === "number" && Number.isFinite(taskDoc.estimateHours)
      ? taskDoc.estimateHours
      : null;
  const normalized = normalizeSlotRange(start, end, estimateHours);
  if (!normalized) return { error: "Ugyldig starttid", status: 400 };

  start = snapToWeekday(normalized.start);
  end = snapToWeekday(normalized.end);
  if (end <= start) {
    end = new Date(start.getTime() + 60 * 60_000);
  }

  const rawSlots = Array.isArray(taskDoc.calendarSlots) ? taskDoc.calendarSlots : [];
  const unsetLegacy = taskDoc.scheduledStart instanceof Date && rawSlots.length === 0;

  const updated = await Task.findByIdAndUpdate(
    taskDoc._id,
    {
      $push: {
        calendarSlots: {
          start,
          end,
          userId: new mongoose.Types.ObjectId(calendarUserId),
        },
      },
      ...(unsetLegacy ? { $unset: { scheduledStart: 1, scheduledEnd: 1 } } : {}),
    },
    { new: true },
  ).lean();

  if (!updated) return { error: "Kunne ikke oprette kalenderblok", status: 500 };

  const slots = calendarSlotsFromMongoDoc(updated, { calendarUserId });
  const slot = slots[slots.length - 1];
  return { slotId: slot?.id ?? "", taskId: String(updated._id) };
}

/**
 * @param {string} taskId
 * @param {string} slotId
 * @param {boolean} includeTest
 * @param {{ start: string; end: string }} range
 * @param {number | null | undefined} [slotIndex]
 * @param {import('next-auth').Session | null | undefined} [session]
 */
export async function updateCalendarSlot(taskId, slotId, includeTest, range, slotIndex, session = null) {
  const calendarUserId = calendarUserIdFromSession(session);
  if (!calendarUserId) return { error: "Ugyldig bruger", status: 401 };

  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  let taskDoc = await findTaskForCalendar(taskId, scope);
  if (!taskDoc) return { error: "Opgave ikke fundet", status: 404 };

  taskDoc = await migrateLegacyScheduleToSlots(taskDoc, calendarUserId);

  const resolvedSlotId = resolveSlotMongoId(taskDoc, slotId, slotIndex, calendarUserId);
  if (!resolvedSlotId) return { error: "Kalenderblok ikke fundet", status: 404 };

  let start = snapToWeekday(new Date(String(range.start ?? "")));
  let end = new Date(String(range.end ?? ""));
  const estimateHours =
    typeof taskDoc.estimateHours === "number" && Number.isFinite(taskDoc.estimateHours)
      ? taskDoc.estimateHours
      : null;
  const normalized = normalizeSlotRange(start, end, estimateHours);
  if (!normalized) return { error: "Ugyldig starttid", status: 400 };

  start = snapToWeekday(normalized.start);
  end = snapToWeekday(normalized.end);
  if (end <= start) {
    end = new Date(start.getTime() + 60 * 60_000);
  }

  const userOid = new mongoose.Types.ObjectId(calendarUserId);
  const slotOid = new mongoose.Types.ObjectId(resolvedSlotId);
  const res = await Task.updateOne(
    { _id: taskDoc._id },
    { $set: { "calendarSlots.$[slot].start": start, "calendarSlots.$[slot].end": end } },
    {
      arrayFilters: [{ "slot._id": slotOid, "slot.userId": userOid }],
    },
  );

  if (!res.matchedCount) return { error: "Kalenderblok ikke fundet", status: 404 };

  return { slotId: resolvedSlotId, taskId: String(taskDoc._id) };
}

/**
 * @param {string} taskId
 * @param {string} slotId
 * @param {boolean} includeTest
 * @param {number | null | undefined} [slotIndex]
 * @param {import('next-auth').Session | null | undefined} [session]
 */
export async function deleteCalendarSlot(taskId, slotId, includeTest, slotIndex, session = null) {
  const calendarUserId = calendarUserIdFromSession(session);
  if (!calendarUserId) return { error: "Ugyldig bruger", status: 401 };

  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  let taskDoc = await findTaskForCalendar(taskId, scope);
  if (!taskDoc) return { error: "Opgave ikke fundet", status: 404 };

  taskDoc = await migrateLegacyScheduleToSlots(taskDoc, calendarUserId);

  const resolvedSlotId = resolveSlotMongoId(taskDoc, slotId, slotIndex, calendarUserId);
  if (!resolvedSlotId) return { error: "Kalenderblok ikke fundet", status: 404 };

  if (resolvedSlotId === "__legacy_fields__") {
    return { error: "Kalenderblok ikke fundet", status: 404 };
  }

  const userOid = new mongoose.Types.ObjectId(calendarUserId);
  await Task.findByIdAndUpdate(taskDoc._id, {
    $pull: {
      calendarSlots: {
        _id: new mongoose.Types.ObjectId(resolvedSlotId),
        userId: userOid,
      },
    },
  });

  return { ok: true };
}

/** @deprecated use createCalendarSlot / updateCalendarSlot */
export async function updateTaskSchedule(taskId, includeTest, range, session = null) {
  return createCalendarSlot(taskId, includeTest, range, session);
}

/**
 * @param {import('next-auth').Session} session
 */
export async function resolveCalendarMineAssigneeKey(session) {
  return assigneeMemberKeyForDbUser(session);
}
