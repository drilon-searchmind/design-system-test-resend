/** BigQuery-skriver: generiske tabeller (data som JSON), load jobs, views over seneste snapshot. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const BASE_SCHEMA = [
  { name: "snapshot_id", type: "STRING" },
  { name: "snapshot_at", type: "TIMESTAMP" },
  { name: "id", type: "STRING" },
  { name: "parent_id", type: "STRING" },
  { name: "name", type: "STRING" },
  { name: "data", type: "JSON" },
];

/** Ekstra typede kolonner pr. entitet (nemmere at forespørge end JSON). */
export const EXTRA_SCHEMA = {
  tasks: [
    { name: "list_id", type: "STRING" },
    { name: "status", type: "STRING" },
    { name: "archived", type: "BOOL" },
    { name: "parent_task_id", type: "STRING" },
    { name: "date_created", type: "TIMESTAMP" },
    { name: "date_updated", type: "TIMESTAMP" },
    { name: "date_closed", type: "TIMESTAMP" },
  ],
  comments: [
    { name: "task_id", type: "STRING" },
    { name: "comment_date", type: "TIMESTAMP" },
    { name: "author", type: "STRING" },
  ],
  time_entries: [
    { name: "task_id", type: "STRING" },
    { name: "user_id", type: "STRING" },
    { name: "started_at", type: "TIMESTAMP" },
    { name: "duration_ms", type: "INT64" },
  ],
};

const ATTACHMENT_SCHEMA = [
  { name: "snapshot_id", type: "STRING" },
  { name: "id", type: "STRING" },
  { name: "task_id", type: "STRING" },
  { name: "comment_id", type: "STRING" },
  { name: "source", type: "STRING" },
  { name: "title", type: "STRING" },
  { name: "extension", type: "STRING" },
  { name: "size", type: "INT64" },
  { name: "url", type: "STRING" },
  { name: "status", type: "STRING" },
  { name: "error", type: "STRING" },
  { name: "sha256", type: "STRING" },
  { name: "fetched_at", type: "TIMESTAMP" },
  { name: "content", type: "BYTES" },
  { name: "data", type: "JSON" },
];

const RUNS_SCHEMA = [
  { name: "run_id", type: "STRING" },
  { name: "started_at", type: "TIMESTAMP" },
  { name: "finished_at", type: "TIMESTAMP" },
  { name: "args", type: "JSON" },
  { name: "phases", type: "JSON" },
  { name: "row_counts", type: "JSON" },
];

const MAX_ROWS = 1000;
const MAX_BYTES = 40 * 1024 * 1024;

/**
 * @param {{ projectId: string; credentials: object; datasetId: string; location: string; prefix?: string; snapshotId: string }} o
 */
export function createSink({ projectId, credentials, datasetId, location, prefix = "", snapshotId }) {
  const bq = new BigQuery({ projectId, credentials, location });
  const dataset = bq.dataset(datasetId);
  const snapshotAt = new Date().toISOString();
  /** @type {Map<string, { rows: string[]; bytes: number; total: number }>} */
  const buffers = new Map();
  const created = new Set();
  const counts = /** @type {Record<string, number>} */ ({});
  const tn = (name) => `${prefix}${name}`;

  async function ensureTable(name, schema) {
    if (created.has(name)) return;
    const t = dataset.table(tn(name));
    const [exists] = await t.exists();
    if (!exists) await dataset.createTable(tn(name), { schema });
    created.add(name);
  }

  const schemaFor = (entity) =>
    entity === "attachments" ? ATTACHMENT_SCHEMA
    : entity === "backup_runs" ? RUNS_SCHEMA
    : [...BASE_SCHEMA, ...(EXTRA_SCHEMA[entity] ?? [])];

  /** Flush pr. entitet køres i rækkefølge, og bufferen tømmes FØR load (ellers mistes rækker tilføjet under load). */
  const flushChain = new Map();
  function flush(entity) {
    const prev = flushChain.get(entity) ?? Promise.resolve();
    const next = prev.then(() => doFlush(entity));
    flushChain.set(entity, next.catch(() => {}));
    return next;
  }

  async function doFlush(entity) {
    const b = buffers.get(entity);
    if (!b || b.rows.length === 0) return;
    const rows = b.rows;
    b.rows = [];
    b.bytes = 0;
    await ensureTable(entity, schemaFor(entity));
    const dir = mkdtempSync(join(tmpdir(), "bq-backup-"));
    const file = join(dir, "rows.ndjson");
    writeFileSync(file, rows.join("\n") + "\n");
    try {
      await dataset.table(tn(entity)).load(file, { sourceFormat: "NEWLINE_DELIMITED_JSON", writeDisposition: "WRITE_APPEND" });
    } catch (e) {
      // load fejlede: læg rækkerne tilbage forrest i bufferen, så de ikke går tabt ved et nyt forsøg
      b.rows.unshift(...rows);
      b.bytes += rows.reduce((s, r) => s + r.length, 0);
      throw e;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    counts[entity] = (counts[entity] ?? 0) + rows.length;
  }

  /** Tilføj én række (objekt med de kolonner tabellen har). Data-kolonnen skal være et objekt. */
  async function add(entity, row) {
    let b = buffers.get(entity);
    if (!b) {
      b = { rows: [], bytes: 0, total: 0 };
      buffers.set(entity, b);
    }
    const line = JSON.stringify(entity === "attachments" || entity === "backup_runs" ? row : { snapshot_id: snapshotId, snapshot_at: snapshotAt, ...row });
    b.rows.push(line);
    b.bytes += line.length;
    b.total += 1;
    if (b.rows.length >= MAX_ROWS || b.bytes >= MAX_BYTES) await flush(entity);
  }

  async function flushAll() {
    for (const entity of buffers.keys()) await flush(entity);
  }

  /** Views der viser seneste snapshot: <entitet>_latest */
  async function createViews(entities) {
    for (const entity of entities) {
      const t = tn(entity);
      const [exists] = await dataset.table(t).exists();
      if (!exists) continue;
      const q = `CREATE OR REPLACE VIEW \`${projectId}.${datasetId}.${t}_latest\` AS SELECT * FROM \`${projectId}.${datasetId}.${t}\` WHERE snapshot_id = (SELECT MAX(snapshot_id) FROM \`${projectId}.${datasetId}.${t}\`) QUALIFY ROW_NUMBER() OVER (PARTITION BY id) = 1`;
      await bq.query({ query: q, location });
    }
  }

  /** Id'er på vedhæftede filer der allerede ligger i BigQuery med indhold. */
  async function storedAttachmentIds() {
    const [exists] = await dataset.table(tn("attachments")).exists();
    if (!exists) return new Set();
    const [rows] = await bq.query({
      query: `SELECT DISTINCT id FROM \`${projectId}.${datasetId}.${tn("attachments")}\` WHERE status = 'stored'`,
      location,
    });
    return new Set(rows.map((r) => String(r.id)));
  }

  /**
   * Task-id'er allerede skrevet for et snapshot (til genoptagelse når lokal state er væk).
   * @param {string} [id]
   */
  async function doneTaskIdsFromSnapshot(id = snapshotId) {
    const [exists] = await dataset.table(tn("tasks")).exists();
    if (!exists) return new Set();
    const [rows] = await bq.query({
      query: `SELECT DISTINCT id FROM \`${projectId}.${datasetId}.${tn("tasks")}\` WHERE snapshot_id = @s`,
      params: { s: id },
      location,
    });
    return new Set(rows.map((r) => String(r.id)));
  }

  /** Kontrol: antal rækker i BigQuery for dette snapshot pr. entitet (til sammenligning med det vi skrev). */
  async function verifyCounts() {
    /** @type {Record<string, { skrevet: number; ibigquery: number; ok: boolean }>} */
    const result = {};
    for (const [entity, written] of Object.entries(counts)) {
      if (entity === "backup_runs") continue;
      const [rows] = await bq.query({
        query: `SELECT COUNT(*) AS n FROM \`${projectId}.${datasetId}.${tn(entity)}\` WHERE snapshot_id = @s`,
        params: { s: snapshotId },
        location,
      });
      const n = Number(rows[0].n);
      result[entity] = { skrevet: written, ibigquery: n, ok: n === written };
    }
    return result;
  }

  return { add, flush, flushAll, createViews, storedAttachmentIds, doneTaskIdsFromSnapshot, verifyCounts, counts, snapshotId, snapshotAt, tableName: tn };
}
