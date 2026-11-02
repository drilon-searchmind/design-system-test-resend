import Client from "../lib/db/models/client.js";
import { connectDb } from "../lib/db/mongoose.js";

/** Read-only: list clients and flag duplicate CVRs. */
async function main() {
  await connectDb();
  const docs = await Client.find({})
    .select("slug name cvr status isTest retainerAmount")
    .sort({ name: 1 })
    .lean();

  console.log(`Total clients: ${docs.length}`);
  const withCvr = docs.filter((d) => typeof d.cvr === "string" && d.cvr.trim());
  console.log(`With CVR: ${withCvr.length}`);

  /** @type {Record<string, typeof docs>} */
  const byCvr = {};
  for (const d of withCvr) {
    const key = String(d.cvr).replace(/\D/g, "");
    if (!key) continue;
    (byCvr[key] ??= []).push(d);
  }
  const dupes = Object.entries(byCvr).filter(([, list]) => list.length > 1);
  console.log(`Duplicate CVR groups: ${dupes.length}`);
  for (const [cvr, list] of dupes) {
    console.log(`  CVR ${cvr}:`);
    for (const d of list) {
      console.log(`    - ${d.slug} | ${d.name} | ${d.status} | MRR ${d.retainerAmount ?? 0} | test=${Boolean(d.isTest)}`);
    }
  }
  console.log("Sample (first 8):");
  for (const d of docs.slice(0, 8)) {
    console.log(`  ${d.slug} | ${d.name} | cvr=${d.cvr ?? "—"}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
