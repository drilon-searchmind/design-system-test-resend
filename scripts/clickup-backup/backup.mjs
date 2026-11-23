/**
 * ClickUp → BigQuery backup.
 *
 *   node --env-file=.env scripts/clickup-backup/backup.mjs                 tør kørsel (skriver intet)
 *   node --env-file=.env scripts/clickup-backup/backup.mjs --run           rigtig backup (nyt snapshot)
 *
 * Flag:
 *   --run                 skriv til BigQuery (uden: tør kørsel, kun læsning + rapport)
 *   --only=a,b            kun disse faser: workspace,hierarchy,tasks,time,docs,goals,attachments
 *   --no-task-details     spring GET /task/{id} over (hurtigere; mister checklists/vedhæftninger)
 *   --no-comments         spring kommentarer over
 *   --no-attachments      hent ikke vedhæftede filer (metadata gemmes stadig)
 *   --views               hent også views (team/space/mappe/liste). Dyrt: ét kald pr. liste/mappe, derfor slået fra
 *   --no-archived-tasks   spring pas over for arkiverede tasks (ét kald pr. liste, ca. 1 time ved 5.800 lister)
 *   --no-archived-lists   spring arkiverede lister i mapper over
 *   --tasks-by-list       hent tasks liste for liste i stedet for via workspace-endpointet (langsommere, mest nøjagtigt)
 *   --limit-folders=N     kun de første N mapper (til test, hurtig struktur)
 *   --limit-lists=N       kun de første N lister (til test; tasks hentes da pr. liste)
 *   --prefix=test_        præfiks på tabelnavne (til test)
 *   --auto-resume         (Railway) fortsæt automatisk seneste ufærdige snapshot (højst 7 dage gammelt), ellers nyt.
 *                         Giver også exit-kode 0 ved advarsler, så en genstarts-politik ikke starter forfra.
 *   --max-hours=N         stop pænt efter N timer målt fra snapshottets FØRSTE start (også env MAX_RUNTIME_HOURS).
 *                         Stoppet kørsel kan genoptages, men tidsgrænsen gælder stadig: hæv grænsen for at fortsætte.
 *   --resume=SNAPSHOT_ID  fortsæt en afbrudt kørsel: færdige faser og allerede gemte tasks springes over.
 *                         Snapshot-id'et står i starten af loggen og i .state/. Afbrudt? Kør samme kommando + --resume=ID.
 *
 * Miljø: CLICKUP_API_TOKEN, CLICKUP_TEAM_ID (valgfri), CLICKUP_RPM (standard 90),
 * BQ_PROJECT_ID, BQ_DATASET, BQ_LOCATION, BQ_SERVICE_ACCOUNT_JSON, BQ_ATTACHMENT_MAX_BYTES.
 * Valgfrit: STATE_DIR, OUT_DIR (Railway: sæt til en volume, fx /data/state), MAX_RUNTIME_HOURS,
 * NOTIFY_WEBHOOK_URL (Slack/Discord-kompatibel besked ved start, slut, afbrydelse og nedbrud).
 * Hver kørsel er et nyt snapshot (append). Views <tabel>_latest viser det seneste.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createSink } from "./bq-sink.mjs";
import { createClickUp, pool } from "./clickup-api.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const RUN = args.run === true;
const ALL_PHASES = ["workspace", "hierarchy", "tasks", "time", "docs", "goals", "attachments"];
const phases = typeof args.only === "string" ? args.only.split(",") : ALL_PHASES;
const wantPhase = (p) => phases.includes(p);
const VIEWS = args.views === true;
const SAMPLE = 20; // tasks der hentes i detaljer i tør kørsel, til estimat

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const need = (n) => {
  const v = process.env[n]?.trim();
  if (!v) throw new Error(`${n} mangler i .env`);
  return v;
};
const iso = (ms) => (ms && Number.isFinite(Number(ms)) && Number(ms) > 0 ? new Date(Number(ms)).toISOString() : null);
const str = (v) => (v === undefined || v === null ? null : String(v));

const MAX_HOURS = Number(args["max-hours"] ?? process.env.MAX_RUNTIME_HOURS) || 0;
const AUTO = args["auto-resume"] === true;
// Foretræk volume (/data/state). Lokal .state bruges kun hvis volumen ikke er monteret.
const stateDir =
  process.env.STATE_DIR?.trim() ||
  (existsSync("/data") ? "/data/state" : join(here, ".state"));
const outDir =
  process.env.OUT_DIR?.trim() ||
  (existsSync("/data") ? "/data/out" : join(here, ".out"));

/** Auto-resume: ufærdigt snapshot med flest færdige tasks (højst 14 dage). Env RESUME_SNAPSHOT_ID tvinger et bestemt id. */
if (RUN && typeof args.resume !== "string") {
  const forced = process.env.RESUME_SNAPSHOT_ID?.trim();
  if (forced) {
    args.resume = forced;
    console.log(`[${new Date().toISOString().slice(11, 19)}] Genoptager via RESUME_SNAPSHOT_ID=${forced}`);
  } else if (AUTO && existsSync(stateDir)) {
    let best = null;
    for (const f of readdirSync(stateDir).filter((n) => /^\d{8}T\d{6}Z\.json$/.test(n))) {
      try {
        const s = JSON.parse(readFileSync(join(stateDir, f), "utf8"));
        if (s.finished) continue;
        const age = Date.now() - Date.parse(s.firstStartedAt ?? 0);
        if (!Number.isFinite(age) || age >= 14 * 86400000) continue;
        const n = Array.isArray(s.doneTasks) ? s.doneTasks.length : 0;
        if (!best || n > best.n || (n === best.n && s.snapshotId > best.id)) best = { id: s.snapshotId, n };
      } catch {
        /* spring ulæselig state over */
      }
    }
    if (best) {
      args.resume = best.id;
      console.log(`[${new Date().toISOString().slice(11, 19)}] Auto-resume: ${best.id} (${best.n} tasks færdige i state)`);
    } else {
      console.log(`[${new Date().toISOString().slice(11, 19)}] Auto-resume: ingen ufærdig state i ${stateDir} — starter nyt snapshot`);
    }
  }
}

const snapshotId = typeof args.resume === "string" ? args.resume : new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const startedAt = new Date().toISOString();

/** Besked til Slack/Discord-webhook (valgfri). Fejl her må aldrig vælte backuppen. */
async function notify(text) {
  const url = process.env.NOTIFY_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text }) });
  } catch {
    /* ignorer */
  }
}
process.on("uncaughtException", async (e) => {
  console.error(`NEDBRUD: ${e?.message ?? e}`);
  await notify(`ClickUp-backup ${snapshotId} NEDBRUD: ${String(e?.message ?? e).slice(0, 200)}. Genoptages ved genstart hvis auto-resume er slået til.`);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  throw e;
});

/* Stop-styring: tidsgrænse (MAX_HOURS) eller SIGTERM (fx ny deploy). Arbejdere afslutter den igangværende task og stopper. */
let stopRequested = false;
let interrupted = false;
let currentPhase = "start";
class StopError extends Error {}
const deadlineOf = (first) => (MAX_HOURS ? Date.parse(first) + MAX_HOURS * 3600000 : Infinity);
let deadline = deadlineOf(startedAt);
const shouldStop = () => stopRequested || Date.now() >= deadline;
const stopReason = () => (stopRequested ? "afbrudt af signal (SIGTERM)" : `tidsgrænse på ${MAX_HOURS} timer nået`);
function checkStop() {
  if (shouldStop()) throw new StopError(stopReason());
}
process.on("SIGTERM", () => {
  stopRequested = true;
  log("SIGTERM modtaget: gemmer og stopper pænt");
});
process.on("SIGINT", () => {
  stopRequested = true;
  log("Afbrudt (Ctrl+C): gemmer og stopper pænt");
});

const clickup = createClickUp({ token: need("CLICKUP_API_TOKEN"), rpm: Number(process.env.CLICKUP_RPM) || 90, log });
const get = clickup.get;

/** @type {ReturnType<typeof createSink> | null} */
let sink = null;
if (RUN) {
  let credentials;
  try {
    credentials = JSON.parse(need("BQ_SERVICE_ACCOUNT_JSON"));
  } catch {
    throw new Error("BQ_SERVICE_ACCOUNT_JSON er ikke gyldig JSON");
  }
  sink = createSink({
    projectId: need("BQ_PROJECT_ID"),
    credentials,
    datasetId: need("BQ_DATASET"),
    location: process.env.BQ_LOCATION?.trim() || "EU",
    prefix: typeof args.prefix === "string" ? args.prefix : "",
    snapshotId,
  });
}

/* ------------------------------------------------------------- hjælpere */
const counts = /** @type {Record<string, number>} */ ({});
const phaseLog = /** @type {Array<Record<string, any>>} */ ([]);
const errors = /** @type {string[]} */ ([]);

/** Gem en række (RUN) eller tæl den (tør kørsel). */
async function emit(entity, row) {
  counts[entity] = (counts[entity] ?? 0) + 1;
  if (sink) await sink.add(entity, row);
}
const baseRow = (id, parent, name, data) => ({ id: String(id), parent_id: str(parent), name: str(name), data });

async function phase(name, fn) {
  if (!wantPhase(name)) return;
  if (RUN && donePhases.has(name) && !(name === "hierarchy" || name === "tasks")) {
    log(`Fase ${name} er allerede færdig, springer over`);
    return;
  }
  if (shouldStop()) {
    interrupted = true;
    phaseLog.push({ phase: name, status: "afbrudt", reason: stopReason() });
    return;
  }
  const t0 = Date.now();
  currentPhase = name;
  log(`Fase: ${name}`);
  try {
    await fn();
    if (RUN && !errors.some((e) => e.startsWith(`${name}:`))) {
      donePhases.add(name);
      await saveState();
    }
    phaseLog.push({ phase: name, status: "ok", seconds: Math.round((Date.now() - t0) / 1000) });
  } catch (e) {
    if (e instanceof StopError) {
      interrupted = true;
      phaseLog.push({ phase: name, status: "afbrudt", reason: e.message, seconds: Math.round((Date.now() - t0) / 1000) });
      log(`Fase ${name} afbrudt: ${e.message}`);
      return;
    }
    errors.push(`${name}: ${e.message}`);
    phaseLog.push({ phase: name, status: "fejl", error: String(e.message).slice(0, 300) });
    log(`FEJL i fase ${name}: ${e.message}`);
  }
}

/** Valgfrit endpoint: fejl (fx manglende plan/rettighed) logges, men stopper ikke kørslen. */
async function soft(label, fn) {
  try {
    return await fn();
  } catch (e) {
    errors.push(`${label}: ${e.message}`);
    log(`Springer ${label} over: ${e.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ state */
const statePath = join(stateDir, `${snapshotId}.json`);
const cachePath = (n) => join(stateDir, `${snapshotId}.${n}.json`);
const state = existsSync(statePath) && args.resume ? JSON.parse(readFileSync(statePath, "utf8")) : { doneTasks: [], donePhases: [] };
const doneTasks = new Set(state.doneTasks);
const donePhases = new Set(state.donePhases ?? []);
// tidsgrænsen måles fra snapshottets første start, også efter genstart
const firstStartedAt = state.firstStartedAt ?? startedAt;
deadline = deadlineOf(firstStartedAt);
let finished = false;
async function saveState() {
  if (!RUN) return;
  await sink?.flushAll(); // data skal være i BigQuery, før en task regnes som færdig
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(statePath, JSON.stringify({ snapshotId, firstStartedAt, finished, doneTasks: [...doneTasks], donePhases: [...donePhases] }));
  // vedhæftninger gemmes med, ellers mistes dem for tasks der allerede er færdige ved --resume
  writeFileSync(cachePath("attachments"), JSON.stringify([...attachmentsFound.entries()]));
}
function saveCache(name, data) {
  if (!RUN) return;
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(cachePath(name), JSON.stringify(data));
}
const loadCache = (name) => (existsSync(cachePath(name)) ? JSON.parse(readFileSync(cachePath(name), "utf8")) : null);

/* ----------------------------------------------------------------- fakta */
const teams = (await get("/team")).teams;
const teamId = String(process.env.CLICKUP_TEAM_ID?.trim() || teams[0].id);
const team = teams.find((t) => String(t.id) === teamId) ?? teams[0];
log(`Workspace: ${team.name} (${team.id}) | ${RUN ? `KØRSEL, snapshot ${snapshotId} (gem det til --resume)` : "TØR KØRSEL (skriver intet)"}`);

/** @type {Map<string, any>} */
const attachmentsFound = new Map();
if (RUN && args.resume) for (const [k, v] of loadCache("attachments") ?? []) attachmentsFound.set(k, v);

// Hvis lokal state er væk (volumen/STATE_DIR var forkert), hent færdige task-id'er fra BigQuery
if (RUN && args.resume && sink) {
  try {
    const fromBq = await sink.doneTaskIdsFromSnapshot(snapshotId);
    if (fromBq.size > doneTasks.size) {
      for (const id of fromBq) doneTasks.add(id);
      log(`Genoprettet fremdrift fra BigQuery: ${fromBq.size} tasks allerede skrevet for ${snapshotId}`);
      if (fromBq.size > 0) {
        donePhases.add("workspace");
        donePhases.add("hierarchy");
      }
    } else if (fromBq.size) {
      log(`BigQuery har ${fromBq.size} tasks for ${snapshotId} (matcher lokal state)`);
    }
  } catch (e) {
    log(`Kunne ikke hente færdige tasks fra BigQuery: ${e.message}`);
  }
}

if (RUN) {
  await saveState(); // fejler tidligt, hvis STATE_DIR ikke kan skrives (fx volume mangler)
  log(`State-mappe: ${stateDir}`);
  log(MAX_HOURS ? `Tidsgrænse: ${MAX_HOURS} timer fra ${firstStartedAt} (stopper senest ${new Date(deadline).toISOString()})` : "Ingen tidsgrænse (sæt MAX_RUNTIME_HOURS)");
  log(args.resume ? `Genoptager snapshot ${snapshotId}: ${doneTasks.size} tasks allerede færdige, faser færdige: ${[...donePhases].join(", ") || "ingen"}` : `Nyt snapshot ${snapshotId}`);
  await notify(`ClickUp-backup ${args.resume ? "genoptaget" : "startet"}: snapshot ${snapshotId}${MAX_HOURS ? `, max ${MAX_HOURS} t` : ""}`);
  // hjerteslag hvert 5. minut i loggen, så det er nemt at se at den lever
  setInterval(() => {
    const rows = Object.values(counts).reduce((a, b) => a + b, 0);
    log(`Hjerteslag: fase ${currentPhase}, ${clickup.stats.requests} ClickUp-kald, ${clickup.stats.retries} genforsøg, ${doneTasks.size} tasks færdige, ${rows} rækker`);
  }, 5 * 60000).unref();
}

/** @type {Array<{ id: string; name: string; spaceId: string; folderId: string | null; archived: boolean }>} */
const lists = [];
/** @type {Map<string, any>} */
const taskMeta = new Map();
/* ---------------------------------------------------------------- faser */
await phase("workspace", async () => {
  await emit("workspaces", baseRow(team.id, null, team.name, { ...team, members: undefined }));
  for (const m of team.members ?? []) await emit("members", baseRow(m.user?.id, team.id, m.user?.username ?? m.user?.email, m));
  const groups = await soft("brugergrupper", () => get("/group", { query: { team_id: team.id } }));
  for (const g of groups?.groups ?? []) await emit("user_groups", baseRow(g.id, team.id, g.name, g));
  const types = await soft("custom task types", () => get(`/team/${team.id}/custom_item`));
  for (const t of types?.custom_items ?? []) await emit("custom_task_types", baseRow(t.id, team.id, t.name, t));
  if (VIEWS) {
    const tv = await soft("team views", () => get(`/team/${team.id}/view`));
    for (const v of tv?.views ?? []) await emit("views", baseRow(v.id, team.id, v.name, { ...v, scope: "team" }));
  }
  const tcf = await soft("custom fields (workspace)", () => get(`/team/${team.id}/field`));
  for (const cf of tcf?.fields ?? []) await emit("custom_fields", baseRow(`team:${cf.id}`, team.id, cf.name, { ...cf, scope: "team" }));
  try {
    const guests = await get(`/team/${team.id}/guest`);
    for (const g of guests?.guests ?? []) await emit("guests", baseRow(g.user?.id, team.id, g.user?.username, g));
  } catch (e) {
    log(`Gæster springes over (kræver Enterprise-plan): ${e.message.slice(0, 60)}`);
  }
});

const taskSpaces = new Set();
const seenFolders = new Set();
const limitFolders = typeof args["limit-folders"] === "string" ? Number(args["limit-folders"]) : Infinity;
async function addList(l, spaceId, folderId, archived) {
  if (lists.some((x) => x.id === l.id)) return;
  lists.push({ id: l.id, name: l.name, spaceId, folderId, archived });
  await emit("lists", baseRow(l.id, folderId ?? spaceId, l.name, { ...l, space_id: spaceId, folder_id: folderId, archived }));
  if (VIEWS) {
    const lv = await soft(`views i liste ${l.name}`, () => get(`/list/${l.id}/view`));
    for (const v of lv?.views ?? []) await emit("views", baseRow(v.id, l.id, v.name, { ...v, scope: "list" }));
  }
}

async function readHierarchy() {
  for (const archived of [false, true]) {
    const sp = await get(`/team/${team.id}/space`, { query: { archived } });
    for (const s of sp.spaces) {
      checkStop();
      if (!taskSpaces.has(s.id)) {
        taskSpaces.add(s.id);
        await emit("spaces", baseRow(s.id, team.id, s.name, { ...s, archived }));
        const tags = await soft(`tags i ${s.name}`, () => get(`/space/${s.id}/tag`));
        for (const t of tags?.tags ?? []) await emit("tags", baseRow(`${s.id}:${t.name}`, s.id, t.name, t));
        const cf = await soft(`custom fields i ${s.name}`, () => get(`/space/${s.id}/field`));
        for (const f of cf?.fields ?? []) await emit("custom_fields", baseRow(`${s.id}:${f.id}`, s.id, f.name, { ...f, scope: "space" }));
        if (VIEWS) {
          const sv = await soft(`views i ${s.name}`, () => get(`/space/${s.id}/view`));
          for (const v of sv?.views ?? []) await emit("views", baseRow(v.id, s.id, v.name, { ...v, scope: "space" }));
        }
      }
      for (const fa of [false, true]) {
        const fo = await get(`/space/${s.id}/folder`, { query: { archived: fa } });
        for (const f of fo.folders) {
          checkStop();
          if (seenFolders.has(f.id) || seenFolders.size >= limitFolders) continue;
          seenFolders.add(f.id);
          await emit("folders", baseRow(f.id, s.id, f.name, { ...f, lists: undefined, archived: fa }));
          if (VIEWS) {
            const fv = await soft(`views i mappe ${f.name}`, () => get(`/folder/${f.id}/view`));
            for (const v of fv?.views ?? []) await emit("views", baseRow(v.id, f.id, v.name, { ...v, scope: "folder" }));
          }
          // mappe-svaret indeholder allerede de aktive lister: kun arkiverede kræver et ekstra kald
          for (const l of f.lists ?? []) await addList(l, s.id, f.id, fa);
          if (!args["no-archived-lists"] && !fa) {
            const ls = await soft(`arkiverede lister i ${f.name}`, () => get(`/folder/${f.id}/list`, { query: { archived: true } }));
            for (const l of ls?.lists ?? []) await addList(l, s.id, f.id, true);
          }
        }
        const ls = await get(`/space/${s.id}/list`, { query: { archived: fa } });
        for (const l of ls.lists) await addList(l, s.id, null, fa);
      }
    }
  }
}

await phase("hierarchy", async () => {
  const cached = RUN && args.resume ? loadCache("hierarchy") : null;
  if (cached) {
    lists.push(...cached);
    log(`Struktur genindlæst fra cache: ${lists.length} lister`);
    return;
  }
  await readHierarchy();
  if (typeof args["limit-lists"] === "string") lists.splice(Number(args["limit-lists"]));
  log(`Struktur: ${counts.spaces ?? 0} spaces, ${counts.folders ?? 0} mapper, ${lists.length} lister`);
  saveCache("hierarchy", lists);
  if (!args.resume) log("Tip: ved afbrydelse, kør igen med --resume=" + snapshotId);
});

/** Én task som række. */
const taskRow = (t, d) => ({
  ...baseRow(t.id, t.list?.id ?? null, t.name, d ?? t),
  list_id: str(t.list?.id),
  status: str(t.status?.status),
  archived: Boolean(t.archived),
  parent_task_id: str(t.parent),
  date_created: iso(t.date_created),
  date_updated: iso(t.date_updated),
  date_closed: iso(t.date_closed),
});

function collectCommentAttachments(node, taskId, commentId, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) collectCommentAttachments(n, taskId, commentId, out);
    return out;
  }
  const a = node.attachment;
  if (a && typeof a === "object" && a.url) out.push({ ...a, task_id: taskId, comment_id: commentId, source: "comment" });
  for (const v of Object.values(node)) if (v && typeof v === "object") collectCommentAttachments(v, taskId, commentId, out);
  return out;
}

async function fetchComments(taskId) {
  const all = new Map();
  let start;
  let startId;
  for (let page = 0; page < 200; page += 1) {
    const res = await get(`/task/${taskId}/comment`, { query: { start, start_id: startId } });
    const cs = res.comments ?? [];
    for (const c of cs) all.set(c.id, c);
    if (cs.length < 25) break;
    const last = cs[cs.length - 1];
    start = last.date;
    startId = last.id;
  }
  for (const c of [...all.values()]) {
    if (Number(c.reply_count) > 0) {
      const r = await soft(`svar på kommentar ${c.id}`, () => get(`/comment/${c.id}/reply`));
      for (const rc of r?.comments ?? []) all.set(rc.id, { ...rc, __parent: c.id });
    }
  }
  return [...all.values()];
}

await phase("tasks", async () => {
  // 1) Alle tasks. Standard: workspace-endpointet (100 pr. kald, ikke ét kald pr. liste).
  // Kun slanke felter gemmes i hukommelsen: ellers går Node tør for RAM (~4 GB) ved 30k+ fulde task-objekter.
  const byList = args["tasks-by-list"] === true || typeof args["limit-lists"] === "string" || typeof args["limit-folders"] === "string";
  const cachedTasks = RUN && args.resume ? loadCache("tasks") : null;
  const slim = (t, archived) => ({
    id: String(t.id),
    name: t.name ?? null,
    list: t.list?.id ? { id: String(t.list.id) } : null,
    status: t.status?.status ? { status: String(t.status.status) } : null,
    archived: Boolean(t.archived) || archived,
    parent: t.parent ?? null,
    date_created: t.date_created ?? null,
    date_updated: t.date_updated ?? null,
    date_closed: t.date_closed ?? null,
  });
  const take = (t, archived) => {
    if (!taskMeta.has(t.id)) taskMeta.set(t.id, slim(t, archived));
    else if (archived) taskMeta.get(t.id).archived = true;
  };
  // Delvis fremdrift gemmes undervejs, så en afbrydelse/OOM ikke koster timers kald
  const partial = (RUN && args.resume ? loadCache("tasks-partial") : null) ?? { mainDone: false, mainPage: 0, doneLists: [], tasks: [] };
  const doneLists = new Set(partial.doneLists);
  if (!cachedTasks && partial.tasks.length) {
    for (const t of partial.tasks) taskMeta.set(t.id, t);
    log(`Delvis task-liste genindlæst: ${taskMeta.size} tasks, side ${partial.mainPage}, ${doneLists.size} lister allerede læst`);
  }
  const saveProgress = () =>
    saveCache("tasks-partial", { mainDone: partial.mainDone, mainPage: partial.mainPage, doneLists: [...doneLists], tasks: [...taskMeta.values()] });
  // Ingen markdown i liste-pass: den hentes først i detalje-kaldet (sparere RAM)
  const listTaskQuery = (archived, page) => ({ page, include_closed: true, subtasks: true, archived });
  const listPass = async (ls, archived) => {
    let done = 0;
    const key = (l) => `${archived ? "a" : "l"}:${l.id}`;
    const pending = ls.filter((l) => !doneLists.has(key(l)));
    if (pending.length < ls.length) log(`${ls.length - pending.length} lister er allerede læst, fortsætter med ${pending.length}`);
    await pool(pending, 2, async (l) => {
      for (let page = 0; page < 1000; page += 1) {
        const res = await get(`/list/${l.id}/task`, { query: listTaskQuery(archived, page) });
        for (const t of res.tasks ?? []) take(t, archived);
        if (res.last_page || (res.tasks ?? []).length === 0) break;
      }
      doneLists.add(key(l));
      done += 1;
      if (done % 250 === 0) {
        log(`Lister læst (${archived ? "arkiverede" : "aktive"}): ${done}/${pending.length}, tasks hidtil: ${taskMeta.size}`);
        saveProgress();
      }
    }, shouldStop);
    saveProgress();
    checkStop(); // ufuldstændig task-liste må ikke caches som færdig
  };
  if (cachedTasks) {
    for (const t of cachedTasks) taskMeta.set(t.id, t);
    log(`Task-liste genindlæst fra cache: ${taskMeta.size}`);
  } else {
    if (byList) {
      await listPass(lists, false);
    } else if (partial.mainDone) {
      log("Workspace-tasks er allerede hentet (delvis cache), går videre til arkiverede");
    } else {
      for (let page = partial.mainPage || 0; page < 100000; page += 1) {
        checkStop();
        const res = await get(`/team/${team.id}/task`, { query: { page, include_closed: true, subtasks: true } });
        for (const t of res.tasks ?? []) take(t, false);
        partial.mainPage = page + 1;
        if (page % 50 === 0) {
          log(`Workspace-tasks: side ${page}, tasks hidtil: ${taskMeta.size}`);
          saveProgress();
        }
        if (res.last_page || (res.tasks ?? []).length === 0) break;
      }
      // Kontrol: stikprøve af lister mod workspace-resultatet, så et hul opdages
      const sample = lists.filter((_, i) => i % Math.max(1, Math.floor(lists.length / 10)) === 0).slice(0, 10);
      let missing = 0;
      for (const l of sample) {
        const res = await soft(`kontrol af liste ${l.name}`, () => get(`/list/${l.id}/task`, { query: { include_closed: true, subtasks: true } }));
        for (const t of res?.tasks ?? []) if (!taskMeta.has(t.id)) { missing += 1; take(t, false); }
      }
      if (missing) {
        errors.push(`tasks: workspace-endpointet manglede ${missing} tasks i stikprøven. Kør igen med --tasks-by-list for fuld nøjagtighed.`);
        log(`ADVARSEL: ${missing} tasks manglede i stikprøven. Overvej --tasks-by-list.`);
      } else log(`Kontrol OK: stikprøve af ${sample.length} lister matcher`);
      partial.mainDone = true;
      saveProgress();
    }
    if (!args["no-archived-tasks"]) {
      log("Arkiverede tasks (ét kald pr. liste)");
      await listPass(lists, true);
    }
    saveCache("tasks", [...taskMeta.values()]);
  }
  log(`Tasks fundet: ${taskMeta.size}`);
  counts.tasks_found = taskMeta.size;

  // 2) Detaljer (checklists, vedhæftninger, markdown) + kommentarer pr. task
  const all = [...taskMeta.values()];
  const todo = RUN ? all.filter((t) => !doneTasks.has(t.id)) : all.slice(0, SAMPLE);
  const withDetails = !args["no-task-details"];
  const withComments = !args["no-comments"];
  let n = 0;
  const perTaskReq = (withDetails ? 1 : 0) + (withComments ? 1 : 0) || 1;
  await pool(todo, 3, async (t) => {
    let d = t;
    if (withDetails) {
      const full = await soft(`task ${t.id}`, () => get(`/task/${t.id}`, { query: { include_subtasks: true, include_markdown_description: true } }));
      if (full) d = { ...t, ...full };
    }
    for (const a of d.attachments ?? []) attachmentsFound.set(String(a.id), { ...a, task_id: t.id, source: "task" });
    await emit("tasks", taskRow(t, d));
    if (withComments) {
      const cs = await soft(`kommentarer på ${t.id}`, () => fetchComments(t.id));
      for (const c of cs ?? []) {
        for (const a of collectCommentAttachments(c, t.id, c.id)) attachmentsFound.set(String(a.id ?? a.url), a);
        await emit("comments", {
          ...baseRow(c.id, c.__parent ?? t.id, null, c),
          task_id: t.id,
          comment_date: iso(c.date),
          author: str(c.user?.username ?? c.user?.email),
        });
      }
    }
    doneTasks.add(t.id);
    n += 1;
    if (n % 100 === 0) {
      await saveState();
      const mins = Math.round(((todo.length - n) * perTaskReq) / clickup.rpm);
      log(`Tasks behandlet: ${n}/${todo.length} (ca. ${mins} min tilbage)`);
    }
  }, shouldStop);
  await saveState();
  checkStop(); // stoppet midt i: fasen er ikke færdig, og kan genoptages
});

await phase("time", async () => {
  const members = (team.members ?? []).map((m) => m.user?.id).filter(Boolean);
  const seen = new Set();
  const WINDOW = 90 * 86400000;
  let denied = false;
  for (let from = Date.UTC(2018, 0, 1); from < Date.now() && !denied; from += WINDOW) {
    checkStop();
    const res = await soft("tidsregistreringer", () =>
      get(`/team/${team.id}/time_entries`, {
        query: { start_date: from, end_date: Math.min(from + WINDOW, Date.now()), assignee: members.join(","), include_task_tags: true, include_location_names: true },
      }),
    );
    if (!res && errors.some((e) => e.startsWith("tidsregistreringer: ClickUp 403"))) {
      denied = true;
      log("Tidsregistreringer: ingen adgang (kræver at tokenets bruger er Owner/Admin). Fasen stoppes.");
      break;
    }
    for (const e of res?.data ?? []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      await emit("time_entries", {
        ...baseRow(e.id, e.task?.id ?? null, e.description, e),
        task_id: str(e.task?.id),
        user_id: str(e.user?.id),
        started_at: iso(e.start),
        duration_ms: e.duration !== undefined ? Number(e.duration) : null,
      });
    }
  }
});

await phase("docs", async () => {
  let cursor;
  let docPagesFailed = 0;
  const docs = [];
  do {
    const res = await get(`/workspaces/${team.id}/docs`, { v: 3, query: { limit: 50, cursor } });
    docs.push(...(res.docs ?? []));
    cursor = res.next_cursor || undefined;
  } while (cursor);
  const flat = async (doc, pages, parent) => {
    for (const p of pages ?? []) {
      await emit("doc_pages", { ...baseRow(p.id, parent, p.name, { ...p, pages: undefined, doc_id: doc.id }) });
      await flat(doc, p.pages, p.id);
    }
  };
  for (const d of docs) {
    checkStop();
    await emit("docs", baseRow(d.id, d.parent?.id ?? null, d.name, d));
    let pages = null;
    try {
      pages = await get(`/workspaces/${team.id}/docs/${d.id}/pages`, { v: 3, query: { max_page_depth: -1, content_format: "text/md" } });
    } catch (e) {
      docPagesFailed += 1;
      if (docPagesFailed <= 3) log(`Dokument "${d.name}": sider kunne ikke hentes (${e.message.slice(0, 80)})`);
    }
    await flat(d, Array.isArray(pages) ? pages : pages?.pages, d.id);
  }
  if (docPagesFailed) {
    errors.push(`docs: sider kunne ikke hentes for ${docPagesFailed} af ${docs.length} dokumenter (adgang nægtet). Selve dokumenterne (metadata) er gemt.`);
    log(`ADVARSEL: sider mangler for ${docPagesFailed} af ${docs.length} dokumenter`);
  }
});

await phase("goals", async () => {
  const res = await get(`/team/${team.id}/goal`, { query: { include_completed: true } });
  for (const g of res.goals ?? []) {
    const d = await soft(`mål ${g.name}`, () => get(`/goal/${g.id}`));
    await emit("goals", baseRow(g.id, g.folder_id ?? team.id, g.name, d?.goal ?? g));
  }
});

/* ------------------------------------------------------- vedhæftede filer */
const attachStats = { found: attachmentsFound.size, stored: 0, tooLarge: 0, failed: 0, bytes: 0 };
await phase("attachments", async () => {
  const maxBytes = Number(process.env.BQ_ATTACHMENT_MAX_BYTES) || 10 * 1024 * 1024;
  const list = [...attachmentsFound.values()];
  const have = sink ? await sink.storedAttachmentIds() : new Set();
  await pool(list, 3, async (a) => {
    const id = String(a.id ?? a.url);
    const row = {
      snapshot_id: snapshotId,
      id,
      task_id: str(a.task_id),
      comment_id: str(a.comment_id),
      source: a.source ?? "task",
      title: str(a.title),
      extension: str(a.extension),
      size: a.size !== undefined ? Number(a.size) : null,
      url: str(a.url),
      status: "metadata",
      error: null,
      sha256: null,
      fetched_at: null,
      content: null,
      data: a,
    };
    if (have.has(id)) return; // allerede gemt i et tidligere snapshot
    if (!RUN || args["no-attachments"]) {
      attachStats.bytes += Number(a.size) || 0;
      if (RUN) {
        row.status = "skipped";
        await emit("attachments", row);
      }
      return;
    }
    if (row.size && row.size > maxBytes) {
      row.status = "too_large";
      attachStats.tooLarge += 1;
      await emit("attachments", row);
      return;
    }
    try {
      let res = await fetch(a.url);
      if (res.status === 401 || res.status === 403) res = await fetch(a.url, { headers: { Authorization: need("CLICKUP_API_TOKEN") } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > maxBytes) {
        row.status = "too_large";
        row.size = buf.length;
        attachStats.tooLarge += 1;
      } else {
        row.status = "stored";
        row.size = buf.length;
        row.sha256 = createHash("sha256").update(buf).digest("hex");
        row.content = buf.toString("base64");
        row.fetched_at = new Date().toISOString();
        attachStats.stored += 1;
        attachStats.bytes += buf.length;
      }
    } catch (e) {
      row.status = "download_failed";
      row.error = String(e.message).slice(0, 200);
      attachStats.failed += 1;
    }
    await emit("attachments", row);
  }, shouldStop);
  checkStop();
});

/* -------------------------------------------------------------- afslutning */
const finishedAt = new Date().toISOString();
const summary = {
  mode: RUN ? "run" : "dry-run",
  snapshotId,
  workspace: team.name,
  counts,
  attachments: attachStats,
  clickupRequests: clickup.stats.requests,
  errors,
  phases: phaseLog,
};

if (RUN && sink) {
  await sink.add("backup_runs", {
    run_id: snapshotId,
    started_at: startedAt,
    finished_at: finishedAt,
    args: { ...args, phases },
    phases: phaseLog,
    row_counts: counts,
  });
  await sink.flushAll();
  log(`Skrevet til BigQuery: ${JSON.stringify(sink.counts)}`);
  if (interrupted) {
    // Views peger på det SENESTE snapshot, så et ufærdigt snapshot må ikke blive "latest". Views opdateres når kørslen er færdig.
    log("Kørslen er ikke færdig: _latest-views opdateres ikke, og kontrol springes over");
  } else {
    await sink.createViews(Object.keys(counts).filter((k) => !["tasks_found", "attachments"].includes(k)));
    // Kontrol: ingen tabte rækker. Ved --resume ligger tidligere rækker også i snapshottet, så der er tallene kun vejledende.
    const check = await sink.verifyCounts();
    const bad = Object.entries(check).filter(([, v]) => !v.ok);
    summary.verification = check;
    if (bad.length && !args.resume) {
      for (const [e, v] of bad) errors.push(`verifikation: ${e} skrevet ${v.skrevet}, men ${v.ibigquery} i BigQuery`);
      log(`ADVARSEL: rækketal stemmer ikke for: ${bad.map(([e]) => e).join(", ")}`);
    } else {
      log(bad.length ? "Rækketal afviger, men det er forventeligt ved --resume" : "Kontrol OK: alle rækker er i BigQuery");
    }
    finished = true;
  }
  await saveState(); // gemmer også finished-flaget, så auto-resume ikke tager et færdigt snapshot
} else {
  const T = taskMeta.size;
  const perTask = (args["no-task-details"] ? 0 : 1) + (args["no-comments"] ? 0 : 1);
  const estReq = clickup.stats.requests + Math.max(0, T - SAMPLE) * perTask;
  const sampled = Math.min(SAMPLE, T);
  const attPerTask = sampled ? attachmentsFound.size / sampled : 0;
  summary.estimate = {
    tasks: T,
    requestsForFullRun: estReq,
    minutesAtRpm: { rpm: clickup.rpm, minutes: Math.round(estReq / clickup.rpm) },
    attachments: {
      sampleTasks: sampled,
      foundInSample: attachmentsFound.size,
      note: "Groft skøn: antal i stikprøven skaleret til alle tasks. Størrelsen kendes kun for stikprøven.",
      estimatedCount: Math.round(attPerTask * T),
      sampleBytes: attachStats.bytes,
      estimatedBytes: sampled ? Math.round((attachStats.bytes / sampled) * T) : 0,
    },
  };
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `dry-run-${snapshotId}.json`);
  writeFileSync(file, JSON.stringify(summary, null, 2));
  log(`Rapport gemt: ${file}`);
}
summary.status = interrupted ? "afbrudt" : errors.length ? "advarsler" : "ok";
console.log("\n" + JSON.stringify(summary, null, 2));
if (RUN) {
  const rows = Object.values(counts).reduce((a, b) => a + b, 0);
  await notify(
    interrupted
      ? `ClickUp-backup ${snapshotId} STOPPET (${stopReason()}). ${doneTasks.size} tasks færdige, ${rows} rækker. Kan genoptages: --resume=${snapshotId}`
      : `ClickUp-backup ${snapshotId} FÆRDIG: ${rows} rækker, ${errors.length} advarsler/fejl, ${clickup.stats.requests} kald`,
  );
}
// Exit: 0 = ok (eller stoppet pænt, kan genoptages), 2 = advarsler/fejl. Med --auto-resume er advarsler ikke en fejl
// (ellers ville en genstarts-politik starte kørslen igen, selvom den er færdig).
process.exit(!interrupted && errors.length && !AUTO ? 2 : 0);
