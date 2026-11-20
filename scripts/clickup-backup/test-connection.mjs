/**
 * Forbindelsestest til ClickUp-backup (skriver intet af værdi): kør
 *   node --env-file=.env scripts/clickup-backup/test-connection.mjs
 *
 * 1. ClickUp: henter workspace(s) og tæller spaces.
 * 2. BigQuery: logger ind, tjekker datasettet og region, opretter en testtabel,
 *    skriver en række, læser den tilbage og sletter tabellen igen.
 * Hemmeligheder udskrives aldrig.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const results = [];
const ok = (name, detail = "") => results.push({ name, status: "OK", detail });
const fail = (name, err) => results.push({ name, status: "FEJL", detail: String(err?.message ?? err).slice(0, 300) });

function need(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`${name} mangler i .env`);
  return String(v).trim();
}

/* ---------------------------------------------------------------- ClickUp */
try {
  const token = need("CLICKUP_API_TOKEN");
  const get = async (path) => {
    const res = await fetch(`https://api.clickup.com/api/v2${path}`, { headers: { Authorization: token } });
    if (!res.ok) throw new Error(`ClickUp ${path} svarede ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return res.json();
  };
  const { teams } = await get("/team");
  ok("ClickUp: token virker", `${teams.length} workspace(s): ${teams.map((t) => `${t.name} (${t.id}, ${t.members?.length ?? "?"} medlemmer)`).join(", ")}`);
  const wanted = process.env.CLICKUP_TEAM_ID?.trim();
  const team = teams.find((t) => String(t.id) === wanted) ?? teams[0];
  const { spaces } = await get(`/team/${team.id}/space?archived=false`);
  ok("ClickUp: spaces læses", `${spaces.length} aktive spaces i "${team.name}"`);
} catch (e) {
  fail("ClickUp", e);
}

/* --------------------------------------------------------------- BigQuery */
let bq;
let dataset;
try {
  const projectId = need("BQ_PROJECT_ID");
  const datasetId = need("BQ_DATASET");
  const location = process.env.BQ_LOCATION?.trim() || "EU";
  let credentials;
  try {
    credentials = JSON.parse(need("BQ_SERVICE_ACCOUNT_JSON"));
  } catch {
    throw new Error("BQ_SERVICE_ACCOUNT_JSON er ikke gyldig JSON (tjek anførselstegn og \\n i private_key)");
  }
  bq = new BigQuery({ projectId, credentials, location });
  ok("BigQuery: nøgle læst", `service account: ${credentials.client_email}`);

  dataset = bq.dataset(datasetId);
  const [meta] = await dataset.getMetadata();
  const dsLoc = String(meta.location);
  ok("BigQuery: datasæt findes", `${projectId}.${datasetId} (region ${dsLoc})`);
  const expMs = Number(meta.defaultTableExpirationMs ?? 0);
  if (expMs) {
    ok("BigQuery: ADVARSEL tabeller udløber automatisk", `standard-udløb ${Math.round(expMs / 86400000)} dage (sandbox). En backup må ikke udløbe.`);
  }
  if (dsLoc.toLowerCase() !== location.toLowerCase()) {
    throw new Error(`BQ_LOCATION er "${location}", men datasættet ligger i "${dsLoc}". Ret BQ_LOCATION.`);
  }

  const tableId = `_connection_test_${Date.now()}`;
  const table = dataset.table(tableId);
  await dataset.createTable(tableId, { schema: [{ name: "id", type: "STRING" }, { name: "payload", type: "JSON" }, { name: "file", type: "BYTES" }] });
  ok("BigQuery: kan oprette tabel", tableId);
  try {
    // Load job (batch) i stedet for streaming insert: virker også uden billing/free tier
    const dir = mkdtempSync(join(tmpdir(), "bq-test-"));
    const file = join(dir, "rows.ndjson");
    writeFileSync(file, JSON.stringify({ id: "test", payload: { "æøå": "ok" }, file: Buffer.from("hej").toString("base64") }) + "\n");
    try {
      await table.load(file, { sourceFormat: "NEWLINE_DELIMITED_JSON", writeDisposition: "WRITE_APPEND" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    ok("BigQuery: kan skrive række via load job (JSON + BYTES)");
    const [rows] = await bq.query({ query: `SELECT id, JSON_VALUE(payload, '$."æøå"') AS v, FROM_BASE64(TO_BASE64(file)) = b'hej' AS bytes_ok FROM \`${bq.projectId}.${datasetId}.${tableId}\``, location });
    if (rows.length) ok("BigQuery: kan læse tilbage", JSON.stringify(rows[0]));
    else throw new Error("Rækken kunne ikke læses tilbage");
  } finally {
    await table.delete({ ignoreNotFound: true });
    ok("BigQuery: testtabel slettet");
  }
} catch (e) {
  fail("BigQuery", e);
}

for (const r of results) console.log(`[${r.status}] ${r.name}${r.detail ? " - " + r.detail : ""}`);
process.exit(results.some((r) => r.status === "FEJL") ? 1 : 0);
