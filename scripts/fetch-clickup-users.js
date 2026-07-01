import { exportClickUpUsersCsv } from "../lib/clickup/export-users.js";

async function main() {
  const result = await exportClickUpUsersCsv();
  console.log(`Exported ${result.memberCount} users from ClickUp list ${result.listId}`);
  console.log(`CSV: ${result.csvPath}`);
  console.log(`Meta: ${result.metaPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
