import { exportClickUpKnowledgeBase } from "../lib/clickup/export-knowledge.js";

async function main() {
  const result = await exportClickUpKnowledgeBase();
  console.log(`Exported ${result.pageCount} pages to ${result.outDir}`);
  console.log(JSON.stringify(result.manifest, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
