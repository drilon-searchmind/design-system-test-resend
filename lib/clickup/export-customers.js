import fs from "node:fs/promises";
import path from "node:path";

import { fetchAllViewTasks } from "@/lib/clickup/api";
import { rowsToCsv } from "@/lib/clickup/csv";
import { CUSTOMER_CSV_COLUMNS, mapClickUpCustomerTask } from "@/lib/clickup/customer-map";

const DEFAULT_VIEW_ID = "kg3eh-1173392";

/**
 * Fetch ClickUp Account Dashboard customers and write a review CSV.
 * @param {{ token?: string; viewId?: string; outDir?: string }} [opts]
 */
export async function exportClickUpCustomersCsv(opts = {}) {
  const token = opts.token ?? process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("Missing CLICKUP_API_TOKEN in environment");
  }

  const viewId = opts.viewId ?? process.env.CLICKUP_VIEW_ID ?? DEFAULT_VIEW_ID;
  const outDir = opts.outDir ?? path.join(process.cwd(), "data", "clickup-export");

  const tasks = await fetchAllViewTasks({ token, viewId, includeClosed: true });
  const rows = tasks.map((task) =>
    mapClickUpCustomerTask(/** @type {Record<string, unknown>} */ (task)),
  );

  rows.sort((a, b) => a.name.localeCompare(b.name, "da"));

  const stamp = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(outDir, `customers-${stamp}.csv`);
  const metaPath = path.join(outDir, `customers-${stamp}.json`);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(csvPath, rowsToCsv(CUSTOMER_CSV_COLUMNS, rows), "utf8");
  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        viewId,
        taskCount: rows.length,
        columns: CUSTOMER_CSV_COLUMNS,
        mappingDoc: "mapping/clickup-mapping.html",
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    ok: true,
    viewId,
    taskCount: rows.length,
    csvPath,
    metaPath,
  };
}
