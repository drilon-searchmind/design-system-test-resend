import mongoose from "mongoose";

import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import Client from "@/lib/db/models/client";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { contractToIsoDateOnly, mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { attachMemberUserImage, buildUserImageMapForMembers, userImageByUserId } from "@/lib/server/member-user-images";
import { connectDb } from "@/lib/db/mongoose";
import { assigneeMemberKeyForDbUser } from "@/lib/server/session-team-member";
import { utcTodayCalendarKey } from "@/lib/server/time-entries-data";
import { mapDepartmentTaskRow } from "@/lib/server/tasks-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @param {unknown} status */
function taskOpen(status) {
  const s = String(status ?? "");
  return s !== "done" && s !== "cancelled";
}

/** @typedef {Record<string, unknown>} RawDoc */

/**
 * @typedef {'ok' | 'burn' | 'sell' | 'tight'} WorkloadDeptTone
 * @typedef {ReturnType<typeof mapDepartmentTaskRow>} DeptMini
 */

/**
 * @param {{ capacity: number; assigned: number; tracked: number; perfUtil?: number }} p
 */
function deptToneParts(p) {
  const delta = p.tracked - p.assigned;
  const riskOverBurn = p.assigned > 0 && p.tracked > p.assigned * 1.05;
  const riskOversell = p.capacity > 0 && p.assigned > p.capacity * 0.98;
  const perfUtil = typeof p.perfUtil === "number" && Number.isFinite(p.perfUtil) ? p.perfUtil : 1;
  const riskTight = perfUtil >= 0.98 && perfUtil <= 1.12;

  /** @type {WorkloadDeptTone} */
  let tone = "ok";
  if (riskOverBurn) tone = "burn";
  else if (riskOversell) tone = "sell";
  else if (riskTight) tone = "tight";

  return { delta, riskOverBurn, riskOversell, riskTight, tone };
}

/** @param {RawDoc | undefined | null} t */
function deptKeyTask(t) {
  const dk = typeof t?.departmentKey === "string" ? t.departmentKey.trim() : "";
  return dk || "—";
}

/** @typedef {{ assigned: number }} TaskAggCell */

/**
 * @param {{ includeTest?: boolean; year?: number; month?: number; session?: unknown }} opts
 */
export async function fetchWorkloadPortfolio(opts = {}) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));

  const period = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const monthStart = startOfReportMonth(period.year, period.month);
  const monthLastIso = lastCalendarDayIsoOfReportMonth(period.year, period.month);
  const monthEnd = new Date(`${monthLastIso}T23:59:59.999Z`);

  /** @suppress {explicitTypes} */
  const deptDocsRaw = /** @suppress {explicitTypes} */ await Department.find(/** @type {RawDoc} */ (scope)).sort({ key: 1 }).lean();

  /** @type {(DeptMini & { id: string })[]} */
  const deptMinis =
    deptDocsRaw.map((doc) => ({
      ...mapDepartmentTaskRow(/** @type {RawDoc} */ (doc)),
      id: String(/** @type {RawDoc} */ (doc).key ?? ""),
    })) ?? [];

  /** @typedef {RawDoc[]} TaskDocs */
  const taskDocsRaw = await Task.find(/** @type {RawDoc} */ (andQuery(scope))).lean();
  /** @type {RawDoc[]} */
  const taskDocs = Array.isArray(taskDocsRaw) ? /** @type {RawDoc[]} */ (taskDocsRaw) : [];

  const refDueIso = await utcTodayCalendarKey();
  /** @type {RawDoc[]} */
  const openTasksRaw = /** @type {RawDoc[]} */ (taskDocs.filter((t) => taskOpen(t.status)));

  /** @type {Record<string, TaskAggCell>} */
  const taskAggByDept = {};

  /** @suppress {explicitTypes} */
  for (const task of /** @type {RawDoc[]} */ (taskDocs)) {

    /** @suppress {explicitTypes} */
    const dk = deptKeyTask(task);
    /** @suppress {explicitTypes} */
    if (!taskAggByDept[dk]) taskAggByDept[dk] = { assigned: 0 };

    if (taskOpen(task.status)) {
      const eh =
        typeof task.estimateHours === "number" && Number.isFinite(task.estimateHours) ? task.estimateHours : 0;
      taskAggByDept[dk].assigned += eh;
    }
  }

  /** @typedef {{ minutes: number; billableMinutes: number }} TimeAggCell */
  /** @type {Record<string, TimeAggCell>} */
  const timeAgg = {};

  const rollupMonth =
    /** @type {{ _id: string; minutes: number; billableMinutes: number }[]} */ (
      await TimeEntry.aggregate([
        {
          $match: /** @type {RawDoc} */ (andQuery(scope, { workedAt: { $gte: monthStart, $lte: monthEnd } })),
        },
        {
          $group: {
            _id: { $ifNull: ["$departmentKey", "—"] },
            minutes: { $sum: "$durationMinutes" },
            billableMinutes: {
              $sum: { $cond: [{ $eq: ["$billable", true] }, "$durationMinutes", 0] },
            },
          },
        },
      ])
    );

  for (let ri = 0; ri < rollupMonth.length; ri += 1) {
    const row = rollupMonth[ri];
    const kk = typeof row._id === "string" && row._id.trim() ? row._id.trim() : "—";
    const mins = typeof row.minutes === "number" ? row.minutes : 0;
    const bm = typeof row.billableMinutes === "number" ? row.billableMinutes : 0;
    timeAgg[kk] = { minutes: mins, billableMinutes: bm };
  }

  /** @type {{ billable: number; overhead: number }[]} */
  const utilizationTrend = [];
  for (let od = 13; od >= 0; od -= 1) {
    const ds = new Date(monthEnd.getTime());
    ds.setUTCDate(monthEnd.getUTCDate() - od);
    ds.setUTCHours(0, 0, 0, 0);
    const de = new Date(ds.getTime());
    de.setUTCHours(23, 59, 59, 999);

    if (de < monthStart) {
      utilizationTrend.push({ billable: 0, overhead: 0 });
      continue;
    }

    const dayRoll =
      /** @type {{ bill?: number; all?: number }[]} */ (
        await TimeEntry.aggregate([
          { $match: /** @type {RawDoc} */ (andQuery(scope, { workedAt: { $gte: ds, $lte: de } })) },
          {
            $group: {
              _id: null,
              bill: { $sum: { $cond: [{ $eq: ["$billable", true] }, "$durationMinutes", 0] } },
              all: { $sum: "$durationMinutes" },
            },
          },
        ])
      );

    const allM = Number(dayRoll[0]?.all) || 0;
    const billM = Number(dayRoll[0]?.bill) || 0;
    utilizationTrend.push({
      billable: Math.round((billM / 60) * 10) / 10,
      overhead: Math.round(((allM - billM) / 60) * 10) / 10,
    });
  }

  /** @typedef {{ open: number; high: number; overdue: number }} DemandCell */
  /** @type {Record<string, DemandCell>} */
  const demand = {};
  for (let di = 0; di < deptMinis.length; di += 1) demand[deptMinis[di].id] = { open: 0, high: 0, overdue: 0 };

  for (let oi = 0; oi < openTasksRaw.length; oi += 1) {
    const taskOpenRow = /** @type {RawDoc} */ (openTasksRaw[oi]);
    const dkRaw = deptKeyTask(taskOpenRow);
    if (!demand[dkRaw]) demand[dkRaw] = { open: 0, high: 0, overdue: 0 };
    demand[dkRaw].open += 1;
    if (String(taskOpenRow.priority ?? "") === "high") demand[dkRaw].high += 1;
    const overdueIso = contractToIsoDateOnly(taskOpenRow.dueDate);
    if (overdueIso && overdueIso < refDueIso) demand[dkRaw].overdue += 1;
  }

  let billableMinutesMonth = 0;
  /** @suppress {explicitTypes} */
  for (let ti = 0; ti < Object.keys(timeAgg).length; ti += 1) {
    const tk = /** @type {string} */ (/** @suppress {explicitTypes} */ Object.keys(timeAgg)[ti]);
    billableMinutesMonth += Number(timeAgg[tk]?.billableMinutes) || 0;
  }
  /** @suppress {explicitTypes} */
  const billableHoursMonth = Math.round((billableMinutesMonth / 60) * 10) / 10;

  const activeClientsCount = await Client.countDocuments(/** @type {RawDoc} */ (andQuery(scope, { status: "active" })));

  const memberDocsRaw = await TeamMember.find(/** @type {RawDoc} */ (andQuery(scope, { active: true }))).sort({ key: 1 }).lean();
  /** @type {RawDoc[]} */
  const memberDocs =
    Array.isArray(memberDocsRaw) ? /** @type {RawDoc[]} */ (/** @suppress {explicitTypes} */ memberDocsRaw) : [];
  const memberImageMap = await buildUserImageMapForMembers(memberDocs);
  /** @type {Map<string, string>} */
  const assigneeOidToKey = new Map();
  for (let mi = 0; mi < memberDocs.length; mi += 1) {
    const md = /** @type {RawDoc} */ (memberDocs[mi]);
    const oid = md._id != null ? String(md._id) : "";
    /** @suppress {explicitTypes} */
    if (/** @suppress {explicitTypes} */ oid) assigneeOidToKey.set(oid, String(md.key ?? ""));
  }

  /**
   * @param {RawDoc} t
   */
  function assigneeKeyTask(t) {
    const kk = typeof t.assigneeMemberKey === "string" ? t.assigneeMemberKey.trim() : "";
    if (kk) return kk;
    const aid = t.assigneeId;
    /** @suppress {explicitTypes} */
    if (!aid) return "";
    return assigneeOidToKey.get(String(aid)) ?? "";
  }

  /** @suppress {explicitTypes} */
  const openTaskHigh = /** @suppress {explicitTypes} */ openTasksRaw.reduce(
    (n, tt) => n + (String(/** @type {RawDoc} */ (/** @suppress {explicitTypes} */ tt).priority ?? "") === "high" ? 1 : 0),
    /** @suppress {explicitTypes} */ 0,
  );
  /** @suppress {explicitTypes} */
  const openTaskOverdue = /** @suppress {explicitTypes} */ openTasksRaw.reduce((n, tt) => {
    const iso = /** @suppress {explicitTypes} */ contractToIsoDateOnly(/** @type {RawDoc} */ (/** @suppress {explicitTypes} */ tt).dueDate);
    return n + (iso && iso < refDueIso ? 1 : 0);
    /** @suppress {explicitTypes} */
  }, /** @suppress {explicitTypes} */ 0);

  /** @type {typeof import('@/lib/crm/workload-utils.js').buildDeptWorkloadRows extends () => infer R ? R : never} */
  const deptRows = deptMinis.map((deptMini) => {
    const dk = deptMini.id;
    const agg = taskAggByDept[dk] ?? { assigned: 0 };
    const capacity = typeof deptMini.capacity === "number" ? deptMini.capacity : 0;
    const assigned = agg.assigned;
    const timeCell = timeAgg[dk];
    const trackedRaw = timeCell && typeof timeCell.minutes === "number" ? timeCell.minutes / 60 : 0;
    const tracked = Math.round(trackedRaw * 10) / 10;
    /** @suppress {explicitTypes} */
    const perfUtilRaw = capacity > 0 ? tracked / capacity : assigned > 0 ? tracked / Math.max(assigned, 1) : 1;
    /** @suppress {explicitTypes} */
    const perfUtil = Number.isFinite(perfUtilRaw) ? perfUtilRaw : 1;
    /** @suppress {explicitTypes} */
    const toned = deptToneParts({ capacity, assigned, tracked, perfUtil });
    /** @suppress {explicitTypes} */
    return {
      dept: {
        id: deptMini.id,
        name: deptMini.name,
        short: deptMini.short,
        color: deptMini.color,
        capacity,
      },
      capacity,
      assigned,
      tracked,
      delta: toned.delta,
      riskOverBurn: toned.riskOverBurn,
      riskOversell: toned.riskOversell,
      riskTight: toned.riskTight,
      tone: toned.tone,
      perf: { util: perfUtil },
    };
  });

  const myMemberKey = opts.session != null ? await assigneeMemberKeyForDbUser(opts.session) : "";

  /** @type {Record<string, number>} */
  const perfUtilByDept = {};
  for (let dri = 0; dri < deptRows.length; dri += 1) {
    const dr = deptRows[dri];
    /** @suppress {explicitTypes} */
    const u = typeof dr.perf?.util === "number" && Number.isFinite(dr.perf.util) ? dr.perf.util : 1;
    perfUtilByDept[dr.dept.id] = u;
  }

  /** @type {{ member: Record<string, unknown> & { isMe?: boolean }; openCount: number; highCount: number; overdueCount: number; loadIndex: number }[]} */
  const teamRows = [];
  for (let mdi = 0; mdi < memberDocs.length; mdi += 1) {
    const md = /** @type {RawDoc} */ (memberDocs[mdi]);
    const mk = typeof md.key === "string" ? md.key.trim() : "";
    if (!mk) continue;

    const openForMember = openTasksRaw.filter((trow) => assigneeKeyTask(/** @type {RawDoc} */ (trow)) === mk);
    const openCount = openForMember.length;
    const highCount = openForMember.filter((tx) => String(/** @type {RawDoc} */ (tx).priority ?? "") === "high").length;
    /** @suppress {explicitTypes} */
    const overdueCount = openForMember.filter((tx) => {
      const iso = /** @suppress {explicitTypes} */ contractToIsoDateOnly(/** @type {RawDoc} */ (/** @suppress {explicitTypes} */ tx).dueDate);
      return Boolean(iso && iso /** @suppress {explicitTypes} */ < refDueIso);
    }).length;

    /** @suppress {explicitTypes} */
    const deptK = typeof md.departmentKey === "string" ? md.departmentKey.trim() : "";
    /** @suppress {explicitTypes} */
    const perfU = deptK ? perfUtilByDept[deptK] ?? 1 : 1;
    /** @suppress {explicitTypes} */
    const loadIndex = Math.min(
      100,
      Math.round(28 + openCount * 11 + highCount * 8 + overdueCount * 6 + (perfU > 1.02 ? 18 : perfU > 0.95 ? 8 : 0)),
    );

    /** @suppress {explicitTypes} */
    const baseMember = /** @suppress {explicitTypes} */ mapTeamMemberFromMongo(
      /** @suppress {explicitTypes} */ attachMemberUserImage(/** @suppress {explicitTypes} */ md, memberImageMap),
    );
    /** @type {Record<string, unknown> & { isMe?: boolean }} */
    const memberOut =
      myMemberKey && myMemberKey === mk ? /** @suppress {explicitTypes} */ ({ ...baseMember, isMe: true }) : baseMember;

    teamRows.push({ member: memberOut, openCount, highCount, overdueCount, loadIndex });
  }
  /** @suppress {explicitTypes} */
  teamRows.sort((a, /** @suppress {explicitTypes} */ b) => b.loadIndex - a.loadIndex);

  /** @type {typeof import('@/lib/crm/workload-utils.js').workloadTaskDemandByDept extends () ? never : ReturnType<typeof import('@/lib/crm/workload-utils.js').workloadTaskDemandByDept>} */
  const demandByDept = deptMinis.map((d) => ({
    dept: { id: d.id, name: d.name, short: d.short, color: d.color },
    open: demand[d.id]?.open ?? 0,
    high: demand[d.id]?.high ?? 0,
    overdue: demand[d.id]?.overdue ?? 0,
  }));

  const teamWeeklyHours = memberDocs.reduce(
    /** @suppress {explicitTypes} */
    (/** @suppress {explicitTypes} */ sum, md) =>
      /** @suppress {explicitTypes} */ sum +
      (typeof /** @type {RawDoc} */ (/** @suppress {explicitTypes} */ md).weeklyHours === "number"
        ? /** @suppress {explicitTypes} */ Number(/** @suppress {explicitTypes} */ (/** @type {RawDoc} */ (/** @suppress {explicitTypes} */ md)).weeklyHours)
        : 37),
    0,
  );

  return {
    source: "database",
    reportPeriod: { year: period.year, month: period.month },
    reportPeriodLabel: formatReportPeriodLabel(period.year, period.month),
    reportPeriodSubtitle: formatReportPeriodSubtitle(period.year, period.month),
    deptRows,
    demandByDept,
    openTaskStats: {
      total: openTasksRaw.length,
      high: openTaskHigh,
      overdue: openTaskOverdue,
    },
    teamRows,
    utilizationTrend,
    billableHoursMonth,
    activeClientsCount,
    teamWeeklyHours,
    pulseBudgetAlerts: /** @type {never[]} */ ([]),
  };
}

/**
 * @param {{ memberKey?: string; includeTest?: boolean; year?: number; month?: number; session?: unknown }} opts
 */
export async function fetchWorkloadMemberDetail(opts = {}) {
  await connectDb();
  const mk = String(opts.memberKey ?? "").trim();
  if (!mk) return null;

  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));
  const memRaw = await TeamMember.findOne(/** @type {RawDoc} */ (andQuery(scope, { key: mk }))).lean();
  if (!memRaw || typeof memRaw !== "object") return null;
  const mem = /** @type {RawDoc} */ (memRaw);

  const period = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const monthStart = startOfReportMonth(period.year, period.month);
  const monthLastIso = lastCalendarDayIsoOfReportMonth(period.year, period.month);
  const monthEnd = new Date(`${monthLastIso}T23:59:59.999Z`);

  const oidStr = mem._id != null ? String(mem._id) : "";
  const oidOk = oidStr !== "" && mongoose.Types.ObjectId.isValid(oidStr);

  const myKey = opts.session != null ? await assigneeMemberKeyForDbUser(opts.session) : "";

  const userImage =
    mem.userId != null ? await userImageByUserId(String(mem.userId)) : null;
  const baseMember = mapTeamMemberFromMongo(userImage ? { ...mem, image: userImage } : mem);
  /** @type {Record<string, unknown> & typeof baseMember & { isMe?: boolean }} */
  const member = { ...baseMember };
  if (myKey !== "" && myKey === mk) member.isMe = true;

  const assignedMatch = oidOk
    ? /** @type {RawDoc} */ (
        andQuery(scope, {
          $or: [{ assigneeMemberKey: mk }, { assigneeId: new mongoose.Types.ObjectId(oidStr) }],
        })
      )
    : /** @type {RawDoc} */ (andQuery(scope, { assigneeMemberKey: mk }));

  const assignedTasksRaw = await Task.find(assignedMatch)
    .select("key title clientSlug status priority dueDate estimateHours loggedHours departmentKey hint")
    .sort({ updatedAt: -1 })
    .limit(120)
    .lean();

  const assignedTasks = Array.isArray(assignedTasksRaw) ? /** @type {RawDoc[]} */ (assignedTasksRaw) : [];
  const refDueIso = await utcTodayCalendarKey();
  const openAssigned = assignedTasks.filter((t) => taskOpen(/** @type {RawDoc} */ (t).status));

  let openHigh = 0;
  let openOverdue = 0;
  for (let ti = 0; ti < openAssigned.length; ti += 1) {
    const rd = /** @type {RawDoc} */ (openAssigned[ti]);
    if (String(rd.priority ?? "") === "high") openHigh += 1;
    const dueIso = contractToIsoDateOnly(rd.dueDate);
    if (dueIso && dueIso < refDueIso) openOverdue += 1;
  }

  /** @type {RawDoc} */
  const memberTimeClauses = oidOk
    ? /** @type {RawDoc} */ ({
        workedAt: { $gte: monthStart, $lte: monthEnd },
        $or: [{ memberKey: mk }, { teamMemberId: new mongoose.Types.ObjectId(oidStr) }],
      })
    : /** @type {RawDoc} */ ({
        workedAt: { $gte: monthStart, $lte: monthEnd },
        memberKey: mk,
      });

  const roll = /** @type {{ minutes?: number; billableMinutes?: number }[]} */ (
    await TimeEntry.aggregate([
      { $match: /** @type {RawDoc} */ (andQuery(scope, memberTimeClauses)) },
      {
        $group: {
          _id: null,
          minutes: { $sum: "$durationMinutes" },
          billableMinutes: {
            $sum: { $cond: [{ $eq: ["$billable", true] }, "$durationMinutes", 0] },
          },
        },
      },
    ])
  );

  const minutesMonth = typeof roll[0]?.minutes === "number" ? roll[0].minutes : 0;
  const billableMinutes = typeof roll[0]?.billableMinutes === "number" ? roll[0].billableMinutes : 0;
  const hoursMonth = Math.round((minutesMonth / 60) * 10) / 10;
  const billableHoursMonth = Math.round((billableMinutes / 60) * 10) / 10;

  const tasksOpen = openAssigned.slice(0, 50).map((t) => {
    const rd = /** @type {RawDoc} */ (t);
    return {
      key: typeof rd.key === "string" ? rd.key.trim() : "",
      title: String(rd.title ?? ""),
      clientSlug: String(rd.clientSlug ?? ""),
      status: String(rd.status ?? ""),
      priority: String(rd.priority ?? ""),
      estimateHours:
        typeof rd.estimateHours === "number" && Number.isFinite(rd.estimateHours) ? rd.estimateHours : undefined,
      dueIso: rd.dueDate ? contractToIsoDateOnly(rd.dueDate) : null,
      departmentKey: typeof rd.departmentKey === "string" ? rd.departmentKey.trim() || "—" : "—",
      hint: typeof rd.hint === "string" ? rd.hint : "",
    };
  });

  const deptKey = typeof mem.departmentKey === "string" ? mem.departmentKey.trim() : "";
  const depDocRaw =
    deptKey ?
      await Department.findOne(/** @type {RawDoc} */ (andQuery(scope, { key: deptKey })))
        .select("name shortLabel")
        .lean()
    : null;
  const depDoc = depDocRaw && typeof depDocRaw === "object" ? /** @type {RawDoc} */ (depDocRaw) : null;
  const department = {
    id: deptKey || "—",
    name: depDoc && typeof depDoc.name === "string" ? String(depDoc.name) : deptKey || "—",
    short:
      depDoc && typeof depDoc.shortLabel === "string" ?
        String(depDoc.shortLabel).slice(0, 4)
      : deptKey || "—",
  };

  const loadIndex = Math.min(
    100,
    Math.round(28 + openAssigned.length * 11 + openHigh * 8 + openOverdue * 6),
  );

  return {
    source: "database",
    memberKey: mk,
    member,
    department,
    calendarTodayIso: refDueIso,
    reportPeriod: { year: period.year, month: period.month },
    reportPeriodLabel: formatReportPeriodLabel(period.year, period.month),
    reportPeriodSubtitle: formatReportPeriodSubtitle(period.year, period.month),
    loadIndex,
    openCount: openAssigned.length,
    highCount: openHigh,
    overdueCount: openOverdue,
    openTaskStats: {
      total: openAssigned.length,
      high: openHigh,
      overdue: openOverdue,
    },
    hoursMonth,
    billableHoursMonth,
    tasksOpen,
  };
}
