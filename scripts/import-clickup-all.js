import { importClickUpCustomersFromCsv } from "../lib/clickup/import-customers.js";
import { importClickUpUsersFromCsv } from "../lib/clickup/import-users.js";

async function main() {
  const customers = await importClickUpCustomersFromCsv(process.argv[2]);
  console.log(`Imported ${customers.imported} / ${customers.total} customers from ${customers.csvPath}`);
  if (customers.skipped) console.log(`Skipped ${customers.skipped} customer rows (missing ClickUp id)`);
  if (customers.errors.length) {
    console.error("Customer import errors:");
    for (const err of customers.errors) console.error(" -", err);
    process.exit(1);
  }

  const users = await importClickUpUsersFromCsv(process.argv[3]);
  console.log(`Imported ${users.imported} / ${users.total} users from ${users.csvPath}`);
  if (users.skipped) console.log(`Skipped ${users.skipped} user rows (missing email or ClickUp id)`);
  if (users.errors.length) {
    console.error("User import errors:");
    for (const err of users.errors) console.error(" -", err);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
