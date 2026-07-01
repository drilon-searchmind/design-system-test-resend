import { syncMemberDisciplinesFromClients } from "../lib/server/sync-member-disciplines.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await syncMemberDisciplinesFromClients({ dryRun });
  console.log(
    `${dryRun ? "[dry-run] " : ""}Scanned ${result.clientsScanned} clients · ${result.membersWithDiscipline} members with discipline assignments`,
  );
  console.log(
    `Updated ${result.membersUpdated} team members (${result.membersUnchanged} unchanged) · created ${result.departmentsCreated} departments`,
  );
  if (result.unmatchedAssigneeCount) {
    console.log(`Unmatched assignee names (${result.unmatchedAssigneeCount}):`);
    for (const name of result.unmatchedAssigneeNames) console.log(` - ${name}`);
  }
  if (result.changes.length) {
    console.log("\nSample updates:");
    for (const row of result.changes.slice(0, 12)) {
      console.log(
        ` ${row.name} (${row.key}) → ${row.disciplineKeys.join(", ")} [${row.assignmentCount} kunder]`,
      );
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
