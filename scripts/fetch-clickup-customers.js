import { exportClickUpCustomersCsv } from "../lib/clickup/export-customers.js";

async function main() {
  const result = await exportClickUpCustomersCsv();
  console.log(`Exported ${result.taskCount} customers from ClickUp view ${result.viewId}`);
  console.log(`CSV: ${result.csvPath}`);
  console.log(`Meta: ${result.metaPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
