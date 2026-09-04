import { fetchLatestDeliveryTaskRows } from "@/lib/clickup/fetch-delivery-tasks";

/**
 * Preview-only sync for Delivery opgaver (no Mongo import yet).
 * @param {{ limit?: number; createdFrom?: string; createdTo?: string }} [opts]
 */
export async function previewClickUpTasksSync(opts = {}) {
  const {
    rows,
    teamId,
    spaceId,
    spaceName,
    limit,
    createdFrom,
    createdTo,
    scannedCount,
    matchedCount,
    matchedBeforeLimit,
    pagesFetched,
  } = await fetchLatestDeliveryTaskRows(opts);

  /** @type {Array<{
   *   clickUpTaskId: string;
   *   kind: "new";
   *   clickUpUrl: string;
   *   proposed: Record<string, string>;
   *   current: null;
   *   changes: [];
   * }>} */
  const previewRows = rows.map((row) => ({
    clickUpTaskId: row.clickUpTaskId,
    kind: /** @type {const} */ ("new"),
    clickUpUrl: row.clickUpUrl,
    proposed: {
      name: row.name,
      status: row.status,
      clientName: row.clientName,
      customerFolder: row.customerFolder,
      serviceLine: row.serviceLine,
      serviceLineList: row.serviceLineList,
      assignees: row.assignees,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      isSubtask: row.isSubtask,
    },
    current: null,
    changes: [],
  }));

  return {
    fetchedAt: new Date().toISOString(),
    previewOnly: true,
    teamId,
    spaceId,
    spaceName,
    limit,
    createdFrom,
    createdTo,
    scannedCount,
    matchedCount,
    matchedBeforeLimit,
    pagesFetched,
    total: previewRows.length,
    counts: {
      new: previewRows.length,
      update: 0,
      unchanged: 0,
      skipped: Math.max(0, scannedCount - matchedCount),
    },
    rows: previewRows,
    slowFetchNote:
      scannedCount > matchedCount || (matchedBeforeLimit > matchedCount) ?
        `${scannedCount} tasks scannet i Delivery${createdFrom || createdTo ? " i valgt periode" : ""} — viser ${matchedCount} nyeste efter kunde-mappe → service line filter${matchedBeforeLimit > matchedCount ? ` (${matchedBeforeLimit} matchede)` : ""}.`
      : null,
  };
}
