import {
  fetchAuthorizedTeams,
  fetchFilteredTeamTasks,
  fetchTeamSpaces,
} from "@/lib/clickup/api";
import { isDeliveryWorkTask, mapDeliveryTaskToPreviewRow } from "@/lib/clickup/task-map";

const DEFAULT_TEAM_ID = process.env.CLICKUP_TEAM_ID?.trim() || "";
const DEFAULT_DELIVERY_SPACE_ID = process.env.CLICKUP_DELIVERY_SPACE_ID?.trim() || "";
const DELIVERY_SPACE_NAME_HINT = "[ZP] Delivery";
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

/**
 * @param {Array<Record<string, unknown>>} spaces
 */
function findDeliverySpace(spaces) {
  const exact = spaces.find((space) => String(space.name ?? "").trim() === DELIVERY_SPACE_NAME_HINT);
  if (exact) return exact;

  return spaces.find((space) => {
    const name = String(space.name ?? "").trim().toLowerCase();
    return name.includes("delivery") && name.includes("[zp]");
  });
}

/**
 * @param {string} token
 */
async function resolveTeamId(token) {
  if (DEFAULT_TEAM_ID) return DEFAULT_TEAM_ID;

  const teams = await fetchAuthorizedTeams({ token });
  if (!teams.length) throw new Error("Ingen ClickUp workspaces fundet for tokenet");

  const preferred =
    teams.find((team) => String(team.id ?? "") === "20450769") ??
    teams.find((team) => String(team.name ?? "").toLowerCase().includes("searchmind")) ??
    teams[0];

  const teamId = String(preferred?.id ?? "").trim();
  if (!teamId) throw new Error("Kunne ikke bestemme ClickUp team/workspace id");
  return teamId;
}

/**
 * @param {string} token
 * @param {string} teamId
 */
async function resolveDeliverySpaceId(token, teamId) {
  if (DEFAULT_DELIVERY_SPACE_ID) {
    return { spaceId: DEFAULT_DELIVERY_SPACE_ID, spaceName: DELIVERY_SPACE_NAME_HINT };
  }

  const spaces = await fetchTeamSpaces({ token, teamId });
  const deliverySpace = findDeliverySpace(spaces);
  const spaceId = String(deliverySpace?.id ?? "").trim();
  if (!spaceId) {
    throw new Error(
      `Kunne ikke finde Delivery space (${DELIVERY_SPACE_NAME_HINT}). Sæt CLICKUP_DELIVERY_SPACE_ID.`,
    );
  }

  return {
    spaceId,
    spaceName: String(deliverySpace?.name ?? DELIVERY_SPACE_NAME_HINT).trim(),
  };
}

/**
 * @param {unknown} raw
 */
function parseCalendarDate(raw) {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Start of calendar day (UTC) as Unix ms for ClickUp date_created_gt.
 * @param {string} date YYYY-MM-DD
 */
export function dateToCreatedGtMs(date) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

/**
 * End of calendar day (UTC) as Unix ms for ClickUp date_created_lt.
 * @param {string} date YYYY-MM-DD
 */
export function dateToCreatedLtMs(date) {
  return Date.parse(`${date}T23:59:59.999Z`);
}

/**
 * @param {{ limit?: number; createdFrom?: string; createdTo?: string }} raw
 */
export function normalizeDeliveryTaskFetchOptions(raw = {}) {
  const limit = Math.max(1, Math.min(Number(raw.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, MAX_LIMIT));

  const createdFrom = parseCalendarDate(raw.createdFrom);
  const createdTo = parseCalendarDate(raw.createdTo);

  if (raw.createdFrom && !createdFrom) {
    throw new Error("Ugyldig dato for «Oprettet fra». Brug formatet YYYY-MM-DD.");
  }
  if (raw.createdTo && !createdTo) {
    throw new Error("Ugyldig dato for «Oprettet til». Brug formatet YYYY-MM-DD.");
  }
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new Error("«Oprettet fra» skal være før eller lig med «Oprettet til».");
  }

  return {
    limit,
    createdFrom,
    createdTo,
    dateCreatedGt: createdFrom ? dateToCreatedGtMs(createdFrom) : undefined,
    dateCreatedLt: createdTo ? dateToCreatedLtMs(createdTo) : undefined,
  };
}

/**
 * @param {Record<string, unknown>} task
 */
function taskCreatedMs(task) {
  const n = Number(task.date_created);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Fetch Delivery opgaver (customer folder → service line → task) within a created-date window.
 * @param {{ limit?: number; createdFrom?: string; createdTo?: string }} [opts]
 */
export async function fetchLatestDeliveryTaskRows(opts = {}) {
  const { limit, createdFrom, createdTo, dateCreatedGt, dateCreatedLt } =
    normalizeDeliveryTaskFetchOptions(opts);

  const token = process.env.CLICKUP_API_TOKEN?.trim();
  if (!token) throw new Error("CLICKUP_API_TOKEN mangler");

  const teamId = await resolveTeamId(token);
  const { spaceId, spaceName } = await resolveDeliverySpaceId(token, teamId);

  /** @type {Record<string, unknown>[]} */
  const matchedTasks = [];
  /** @type {Record<string, unknown>[]} */
  const scannedTasks = [];
  let page = 0;
  let lastPage = false;
  let pagesFetched = 0;
  const maxPages = dateCreatedGt || dateCreatedLt ? 20 : 12;

  while (matchedTasks.length < limit && page < maxPages && !lastPage) {
    const batch = await fetchFilteredTeamTasks({
      token,
      teamId,
      spaceIds: [spaceId],
      page,
      orderBy: "created",
      reverse: true,
      includeClosed: true,
      subtasks: true,
      dateCreatedGt,
      dateCreatedLt,
    });

    pagesFetched += 1;
    lastPage = batch.lastPage;
    scannedTasks.push(...batch.tasks);

    for (const task of batch.tasks) {
      if (!isDeliveryWorkTask(/** @type {Record<string, unknown>} */ (task))) continue;
      matchedTasks.push(/** @type {Record<string, unknown>} */ (task));
    }

    if (batch.tasks.length === 0) break;
    page += 1;
  }

  matchedTasks.sort((a, b) => taskCreatedMs(b) - taskCreatedMs(a));
  const sliced = matchedTasks.slice(0, limit);
  const rows = sliced.map((task) => mapDeliveryTaskToPreviewRow(task));

  return {
    rows,
    teamId,
    spaceId,
    spaceName,
    limit,
    createdFrom,
    createdTo,
    scannedCount: scannedTasks.length,
    matchedCount: rows.length,
    matchedBeforeLimit: matchedTasks.length,
    pagesFetched,
  };
}
