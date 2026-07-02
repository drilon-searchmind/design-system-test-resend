import { importClickUpCustomersFromApi } from "../lib/clickup/import-customers.js";
import { importClickUpUsersFromApi } from "../lib/clickup/import-users.js";

async function main() {
  const customers = await importClickUpCustomersFromApi();
  console.log(
    `Imported ${customers.imported} / ${customers.total} customers from ClickUp API (view ${customers.viewId})`,
  );
  if (customers.skipped) console.log(`Skipped ${customers.skipped} customer rows (missing ClickUp id)`);
  if (customers.errors.length) {
    console.error("Customer import errors:");
    for (const err of customers.errors) console.error(" -", err);
    process.exit(1);
  }

  const users = await importClickUpUsersFromApi();
  console.log(`Imported ${users.imported} / ${users.total} users from ClickUp API (list ${users.listId})`);
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
