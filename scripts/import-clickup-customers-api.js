import { importClickUpCustomersFromApi } from "../lib/clickup/import-customers.js";

async function main() {
  const result = await importClickUpCustomersFromApi();
  console.log(
    `Imported ${result.imported} / ${result.total} customers from ClickUp API (view ${result.viewId})`,
  );
  if (result.skipped) console.log(`Skipped ${result.skipped} rows (missing ClickUp id)`);
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
