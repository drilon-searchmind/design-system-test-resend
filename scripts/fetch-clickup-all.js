import { exportClickUpCustomersCsv } from "../lib/clickup/export-customers.js";
import { exportClickUpUsersCsv } from "../lib/clickup/export-users.js";

async function main() {
  const customers = await exportClickUpCustomersCsv();
  console.log(`Exported ${customers.taskCount} customers from ClickUp view ${customers.viewId}`);
  console.log(`CSV: ${customers.csvPath}`);
  console.log(`Meta: ${customers.metaPath}`);

  const users = await exportClickUpUsersCsv();
  console.log(`Exported ${users.memberCount} users from ClickUp list ${users.listId}`);
  console.log(`CSV: ${users.csvPath}`);
  console.log(`Meta: ${users.metaPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
