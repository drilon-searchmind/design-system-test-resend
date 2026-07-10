import KnowledgeArticle from "../lib/db/models/knowledge-article.js";
import { connectDb } from "../lib/db/mongoose.js";

async function main() {
  await connectDb();
  const result = await KnowledgeArticle.deleteMany({});
  console.log(`Deleted ${result.deletedCount ?? 0} knowledge articles`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
