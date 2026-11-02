import {
  customFieldsByLooseName,
  customFieldsByName,
  fieldValue,
  looseFieldValue,
  normalizeFieldName,
} from "@/lib/clickup/custom-fields";

/** Delivery task custom field names (see mapping/clickup-mapping.html). */
const CU = {
  client: "Client",
  serviceLine: "Service Line",
};

/** Internal Delivery folders (not customer work). */
const INTERNAL_FOLDER_PATTERN = /^0\d+-/i;

/**
 * Delivery opgaver live in: Space → customer folder → service line list → task.
 * @param {Record<string, unknown>} task
 */
export function isDeliveryWorkTask(task) {
  if (!task || typeof task !== "object") return false;

  const list = /** @type {Record<string, unknown> | undefined} */ (task.list);
  const folder =
    /** @type {Record<string, unknown> | undefined} */ (task.folder) ??
    /** @type {Record<string, unknown> | undefined} */ (task.project);

  if (!list || typeof list.id === "undefined" || !String(list.name ?? "").trim()) return false;
  if (!folder || typeof folder.id === "undefined") return false;

  const folderName = String(folder.name ?? "").trim();
  if (!folderName) return false;
  if (INTERNAL_FOLDER_PATTERN.test(folderName)) return false;

  return true;
}

/** @param {unknown} ms @returns {string} ISO-tidsstempel eller "" */
function msToIso(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString();
}

/**
 * @param {unknown} user
 * @returns {{ id: string; email: string; username: string; color: string; initials: string; profilePicture: string } | null}
 */
function mapClickUpUser(user) {
  if (!user || typeof user !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (user);
  const id = String(row.id ?? "").trim();
  const email = String(row.email ?? "").trim().toLowerCase();
  const username = String(row.username ?? "").trim();
  if (!id && !email) return null;
  return {
    id,
    email,
    username,
    color: String(row.color ?? "").trim(),
    initials: String(row.initials ?? "").trim(),
    profilePicture: String(row.profilePicture ?? "").trim(),
  };
}

/**
 * Fuld, struktureret ClickUp-opgave til import (alt Agency OS kan bruge).
 * @param {Record<string, unknown>} task
 */
export function mapDeliveryTaskToImportRow(task) {
  const byLoose = customFieldsByLooseName(
    /** @type {Record<string, unknown>[]} */ (task.custom_fields ?? []),
  );
  const list = /** @type {Record<string, unknown>} */ (task.list ?? {});
  const folder = /** @type {Record<string, unknown>} */ (task.folder ?? task.project ?? {});
  const statusObj = /** @type {Record<string, unknown> | undefined} */ (task.status);
  const priorityObj = /** @type {Record<string, unknown> | null | undefined} */ (task.priority);
  const assignees = (Array.isArray(task.assignees) ? task.assignees : [])
    .map(mapClickUpUser)
    .filter((u) => u !== null);
  const tags = (Array.isArray(task.tags) ? task.tags : [])
    .map((t) => String(/** @type {Record<string, unknown>} */ (t)?.name ?? "").trim())
    .filter(Boolean);
  const timeEstimate = Number(task.time_estimate);
  const timeSpent = Number(task.time_spent);
  const checklists = Array.isArray(task.checklists) ? task.checklists : [];
  const checklistItems = checklists.reduce(
    (n, c) => n + (Array.isArray(/** @type {Record<string, unknown>} */ (c)?.items) ? /** @type {unknown[]} */ (/** @type {Record<string, unknown>} */ (c).items).length : 0),
    0,
  );

  return {
    clickUpTaskId: String(task.id ?? "").trim(),
    clickUpUrl: String(task.url ?? "").trim(),
    name: String(task.name ?? "").trim(),
    description: String(task.description ?? task.text_content ?? "").trim(),
    statusName: String(statusObj?.status ?? "").trim(),
    statusType: String(statusObj?.type ?? "").trim(),
    priority: String(priorityObj?.priority ?? "").trim(),
    dueDateIso: msToIso(task.due_date),
    startDateIso: msToIso(task.start_date),
    createdAtIso: msToIso(task.date_created),
    updatedAtIso: msToIso(task.date_updated),
    closedAtIso: msToIso(task.date_done ?? task.date_closed),
    timeEstimateHours: Number.isFinite(timeEstimate) && timeEstimate > 0 ? timeEstimate / 3_600_000 : 0,
    timeSpentHours: Number.isFinite(timeSpent) && timeSpent > 0 ? timeSpent / 3_600_000 : 0,
    tags,
    assignees,
    creator: mapClickUpUser(task.creator),
    watchersCount: Array.isArray(task.watchers) ? task.watchers.length : 0,
    parentId: task.parent ? String(task.parent) : "",
    folderName: String(folder.name ?? "").trim(),
    listName: String(list.name ?? "").trim(),
    serviceLine: looseFieldValue(byLoose, "Service Line"),
    clientField: looseFieldValue(byLoose, "Client"),
    clientLead: looseFieldValue(byLoose, "Client Lead"),
    recordType: looseFieldValue(byLoose, "Record Type"),
    deliveryRoles: looseFieldValue(byLoose, "Delivery Role")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
    budgetMonth: looseFieldValue(byLoose, "Budget Month"),
    progressPercent: Number(
      /** @type {Record<string, unknown> | undefined} */ (byLoose[normalizeFieldName("Progress")]?.value)
        ?.percent_complete ?? 0,
    ),
    points: typeof task.points === "number" ? task.points : null,
    checklistItems,
    dependenciesCount: Array.isArray(task.dependencies) ? task.dependencies.length : 0,
    linkedTasksCount: Array.isArray(task.linked_tasks) ? task.linked_tasks.length : 0,
    archived: task.archived === true,
  };
}

/**
 * @param {unknown} ms
 */
function formatCreatedAt(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * @param {unknown} ms
 */
function formatDueDate(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString().slice(0, 10);
}

/**
 * @param {Record<string, unknown>} task
 */
function assigneeLabel(task) {
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const names = assignees
    .map((user) => {
      if (!user || typeof user !== "object") return "";
      const row = /** @type {Record<string, unknown>} */ (user);
      return String(row.username ?? row.email ?? "").trim();
    })
    .filter(Boolean);
  return names.join("; ");
}

/**
 * Map a ClickUp Delivery task to a flat preview row.
 * @param {Record<string, unknown>} task
 */
export function mapDeliveryTaskToPreviewRow(task) {
  const byName = customFieldsByName(
    /** @type {Record<string, unknown>[]} */ (task.custom_fields ?? []),
  );

  const list = /** @type {Record<string, unknown>} */ (task.list ?? {});
  const folder =
    /** @type {Record<string, unknown>} */ (task.folder ?? task.project ?? {});

  const clientFromField = fieldValue(byName, CU.client);
  const serviceLineFromField = fieldValue(byName, CU.serviceLine);
  const folderName = String(folder.name ?? "").trim();
  const listName = String(list.name ?? "").trim();

  const statusObj = /** @type {Record<string, unknown> | undefined} */ (task.status);
  const status = String(statusObj?.status ?? "").trim();

  const clickUpTaskId = String(task.id ?? "").trim();
  const parentId = task.parent ? String(task.parent) : "";

  return {
    clickUpTaskId,
    name: String(task.name ?? "").trim(),
    status,
    clientName: clientFromField || folderName,
    customerFolder: folderName,
    serviceLine: serviceLineFromField || listName,
    serviceLineList: listName,
    assignees: assigneeLabel(task),
    dueDate: formatDueDate(task.due_date),
    createdAt: formatCreatedAt(task.date_created),
    isSubtask: parentId ? "Ja" : "Nej",
    clickUpUrl: String(task.url ?? "").trim(),
  };
}
