/**
 * Sletter alle tabeller og views med et givent præfiks (standard test_) i BigQuery-datasættet.
 *
 *   node --env-file=.env scripts/clickup-backup/cleanup-test.mjs            viser hvad der ville blive slettet
 *   node --env-file=.env scripts/clickup-backup/cleanup-test.mjs --yes      sletter
 *   ... --prefix=test_
 *
 * Af sikkerhedsgrunde kræves et præfiks på mindst 3 tegn, så de rigtige tabeller aldrig kan ramme.
 */
import { BigQuery } from "@google-cloud/bigquery";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const prefix = typeof args.prefix === "string" ? args.prefix : "test_";
if (prefix.length < 3) throw new Error("Præfikset er for kort");

const need = (n) => {
  const v = process.env[n]?.trim();
  if (!v) throw new Error(`${n} mangler i .env`);
  return v;
};

const bq = new BigQuery({
  projectId: need("BQ_PROJECT_ID"),
  credentials: JSON.parse(need("BQ_SERVICE_ACCOUNT_JSON")),
  location: process.env.BQ_LOCATION?.trim() || "EU",
});
const dataset = bq.dataset(need("BQ_DATASET"));

const [tables] = await dataset.getTables();
const hits = tables.filter((t) => t.id?.startsWith(prefix));
// views først (de peger på tabellerne), men BigQuery kræver ikke rækkefølge
for (const t of hits) {
  console.log(`${args.yes === true ? "Sletter" : "Ville slette"}: ${t.id}`);
  if (args.yes === true) await t.delete();
}
console.log(hits.length ? `${hits.length} objekter${args.yes === true ? " slettet" : ". Kør med --yes for at slette"}` : "Ingen objekter med præfikset");
