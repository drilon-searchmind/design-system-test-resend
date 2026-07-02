import { exportClickUpCustomersCsv } from "../lib/clickup/export-customers.js";
import { exportClickUpUsersCsv } from "../lib/clickup/export-users.js";
import { importClickUpCustomersFromCsv } from "../lib/clickup/import-customers.js";
import { importClickUpUsersFromCsv } from "../lib/clickup/import-users.js";
import { syncMemberDisciplinesFromClients } from "../lib/server/sync-member-disciplines.js";

async function main() {
  const dryRunDisciplines = process.argv.includes("--dry-run-disciplines");
  const skipDisciplines = process.argv.includes("--skip-disciplines");

  console.log("Step 1/4 — Export customers from ClickUp…");
  const customersExport = await exportClickUpCustomersCsv();
  console.log(`  → ${customersExport.taskCount} rows → ${customersExport.csvPath}`);

  console.log("Step 2/4 — Export users from ClickUp…");
  const usersExport = await exportClickUpUsersCsv();
  console.log(`  → ${usersExport.memberCount} rows → ${usersExport.csvPath}`);

  console.log("Step 3/4 — Import customers CSV to MongoDB…");
  const customersImport = await importClickUpCustomersFromCsv(customersExport.csvPath);
  console.log(`  → ${customersImport.imported} / ${customersImport.total} imported`);
  if (customersImport.errors.length) throw new Error(customersImport.errors[0]);

  console.log("Step 4/4 — Import users CSV to MongoDB…");
  const usersImport = await importClickUpUsersFromCsv(usersExport.csvPath);
  console.log(`  → ${usersImport.imported} / ${usersImport.total} imported`);
  if (usersImport.errors.length) throw new Error(usersImport.errors[0]);

  if (!skipDisciplines) {
    console.log(
      dryRunDisciplines ?
        "Bonus — Sync member disciplines (dry run)…"
      : "Bonus — Sync member disciplines…",
    );
    const sync = await syncMemberDisciplinesFromClients({ dryRun: dryRunDisciplines });
    console.log(
      `  → ${sync.membersUpdated} members updated, ${sync.membersUnchanged} unchanged (${sync.clientsScanned} clients scanned)`,
    );
  }

  console.log("ClickUp migrate complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
