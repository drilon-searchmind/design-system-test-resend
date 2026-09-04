import { customFieldsByName, fieldValue } from "@/lib/clickup/custom-fields";

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
