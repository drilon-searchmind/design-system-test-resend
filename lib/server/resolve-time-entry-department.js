import mongoose from "mongoose";

import Task from "@/lib/db/models/task";

/**
 * @param {{ departmentKey?: string; disciplineKeys?: string[] } | null | undefined} memberDoc
 */
export function memberDefaultDepartmentKey(memberDoc) {
  if (!memberDoc || typeof memberDoc !== "object") return undefined;
  const primary = typeof memberDoc.departmentKey === "string" ? memberDoc.departmentKey.trim() : "";
  if (primary) return primary;
  const keys = Array.isArray(memberDoc.disciplineKeys) ? memberDoc.disciplineKeys : [];
  for (const k of keys) {
    const s = typeof k === "string" ? k.trim() : "";
    if (s) return s;
  }
  return undefined;
}

/**
 * @param {{
 *   explicitKey?: string;
 *   taskOid?: mongoose.Types.ObjectId;
 *   taskDoc?: { departmentKey?: string } | null;
 *   memberDoc?: { departmentKey?: string; disciplineKeys?: string[] } | null;
 *   scope?: Record<string, unknown>;
 * }} opts
 */
export async function resolveTimeEntryDepartmentKey(opts) {
  const explicit = typeof opts.explicitKey === "string" ? opts.explicitKey.trim() : "";
  if (explicit && explicit !== "—") return explicit;

  let taskDept = "";
  if (opts.taskDoc && typeof opts.taskDoc.departmentKey === "string") {
    taskDept = opts.taskDoc.departmentKey.trim();
  } else if (opts.taskOid) {
    const q =
      opts.scope && typeof opts.scope === "object" ?
        { ...opts.scope, _id: opts.taskOid }
      : { _id: opts.taskOid };
    const tdoc = /** @type {{ departmentKey?: string } | null} */ (
      await Task.findOne(q).select("departmentKey").lean()
    );
    if (typeof tdoc?.departmentKey === "string") taskDept = tdoc.departmentKey.trim();
  }
  if (taskDept) return taskDept;

  return memberDefaultDepartmentKey(opts.memberDoc);
}

/**
 * @param {Record<string, unknown>[]} entries
 * @param {Record<string, unknown>} scope
 */
export async function buildTaskDepartmentLookup(entries, scope) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (typeof e.departmentKey === "string" && e.departmentKey.trim()) continue;
    const tid = e.taskId != null ? String(e.taskId) : "";
    if (tid && mongoose.Types.ObjectId.isValid(tid)) ids.add(tid);
  }
  if (!ids.size) return /** @type {Record<string, string>} */ ({});

  const oids = [...ids].map((id) => new mongoose.Types.ObjectId(id));
  const rows = /** @type {Record<string, unknown>[]} */ (
    await Task.find({ ...scope, _id: { $in: oids } })
      .select("departmentKey")
      .lean()
  );

  /** @type {Record<string, string>} */
  const map = {};
  for (const row of rows) {
    const id = String(row._id ?? "");
    const dk = typeof row.departmentKey === "string" ? row.departmentKey.trim() : "";
    if (id && dk) map[id] = dk;
  }
  return map;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {Record<string, string>} taskDeptById
 */
export function effectiveTimeEntryDepartmentKey(entry, taskDeptById = {}) {
  const direct = typeof entry.departmentKey === "string" ? entry.departmentKey.trim() : "";
  if (direct) return direct;
  const tid = entry.taskId != null ? String(entry.taskId) : "";
  if (tid && taskDeptById[tid]) return taskDeptById[tid];
  return "";
}
