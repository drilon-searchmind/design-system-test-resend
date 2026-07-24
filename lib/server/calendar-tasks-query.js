import Client from "@/lib/db/models/client";
import Task from "@/lib/db/models/task";
import { connectDb } from "@/lib/db/mongoose";
import { buildTaskWireRow, enrichTaskWireRowsWithParents } from "@/lib/server/tasks-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * All workspace tasks for calendar (not limited to report month).
 * @param {{ includeTest?: boolean; calendarUserId?: string }} opts
 */
export async function fetchAllTasksForCalendar(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  const calendarUserId =
    typeof opts.calendarUserId === "string" ? opts.calendarUserId.trim() : "";
  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  const tasksRaw = await Task.find(/** @type {Record<string, unknown>} */ (scope))
    .sort({ dueDate: 1, title: 1 })
    .lean();

  const taskDocs = Array.isArray(tasksRaw) ? tasksRaw : [];
  const ids = [...new Set(taskDocs.map((t) => String(t.clientId)))];
  if (!ids.length) return [];

  const clientDocs = await Client.find({
    _id: { $in: ids },
    ...scope,
  })
    .select("slug name logoInitials hue")
    .lean();

  /** @type {Record<string, Record<string, unknown>>} */
  const clientById = {};
  for (const c of Array.isArray(clientDocs) ? clientDocs : []) {
    clientById[String(c._id)] = /** @type {Record<string, unknown>} */ (c);
  }

  /** @type {ReturnType<typeof buildTaskWireRow>[]} */
  const built = [];
  for (const td of taskDocs) {
    const cd = clientById[String(td.clientId)];
    if (!cd) continue;
    built.push(
      buildTaskWireRow(td, cd, {
        calendarUserId: calendarUserId || undefined,
      }),
    );
  }

  return enrichTaskWireRowsWithParents(built, scope);
}
