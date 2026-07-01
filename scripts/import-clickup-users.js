import { importClickUpUsersFromCsv } from "../lib/clickup/import-users.js";

async function main() {
  const csvArg = process.argv[2];
  const result = await importClickUpUsersFromCsv(csvArg);
  console.log(`Imported ${result.imported} / ${result.total} users from ${result.csvPath}`);
  if (result.skipped) console.log(`Skipped ${result.skipped} rows (missing email or ClickUp id)`);
  if (result.errors.length) {
    console.error("Errors:");
    for (const err of result.errors) console.error(" -", err);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
