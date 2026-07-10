import { importClickUpKnowledgeWiki } from "../lib/clickup/import-knowledge-wiki.js";

async function main() {
  const result = await importClickUpKnowledgeWiki({ replaceExisting: true });
  console.log(`Imported ${result.imported} wiki pages (${result.created} new, ${result.updated} updated)`);
  console.log(`Skipped ${result.skipped} pages from full ClickUp export`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
