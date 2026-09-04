const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

/**
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string | number | boolean | undefined>} [query]
 */
async function clickUpGet(token, path, query = {}) {
  const url = new URL(`${CLICKUP_API_BASE}${path}`);
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined || val === "") continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== undefined && item !== "") url.searchParams.append(key, String(item));
      }
      continue;
    }
    url.searchParams.set(key, String(val));
  }

  const res = await fetch(url, {
    headers: { Authorization: token },
  });

  const data = await res.json();
  if (!res.ok) {
    const message =
      typeof data?.err === "string" ? data.err
      : typeof data?.message === "string" ? data.message
      : `ClickUp API ${res.status}`;
    throw new Error(message);
  }
  return data;
}

/**
 * Fetch all tasks visible in a ClickUp view (paginated).
 * @param {{ token: string; viewId: string; includeClosed?: boolean }} opts
 */
export async function fetchAllViewTasks(opts) {
  const { token, viewId, includeClosed = true } = opts;
  /** @type {Record<string, unknown>[]} */
  const tasks = [];
  let page = 0;

  while (true) {
    const data = await clickUpGet(token, `/view/${encodeURIComponent(viewId)}/task`, {
      page,
      include_closed: includeClosed ? "true" : "false",
    });
    const batch = Array.isArray(data.tasks) ? data.tasks : [];
    tasks.push(...batch);
    if (data.last_page === true || batch.length === 0) break;
    page += 1;
  }

  return tasks;
}

/**
 * Fetch members with explicit access to a ClickUp list.
 * @see https://developer.clickup.com/reference/getlistmembers
 * @param {{ token: string; listId: string | number }} opts
 */
export async function fetchListMembers(opts) {
  const { token, listId } = opts;
  const data = await clickUpGet(token, `/list/${encodeURIComponent(String(listId))}/member`);
  return Array.isArray(data.members) ? data.members : [];
}

/**
 * @param {{ token: string }} opts
 */
export async function fetchAuthorizedTeams(opts) {
  const data = await clickUpGet(opts.token, "/team");
  return Array.isArray(data.teams) ? data.teams : [];
}

/**
 * @param {{ token: string; teamId: string | number }} opts
 */
export async function fetchTeamSpaces(opts) {
  const { token, teamId } = opts;
  const data = await clickUpGet(token, `/team/${encodeURIComponent(String(teamId))}/space`, {
    archived: "false",
  });
  return Array.isArray(data.spaces) ? data.spaces : [];
}

/**
 * Latest tasks in a workspace, optionally scoped to spaces.
 * @see https://developer.clickup.com/reference/getfilteredteamtasks
 * @param {{
 *   token: string;
 *   teamId: string | number;
 *   spaceIds?: Array<string | number>;
 *   page?: number;
 *   orderBy?: "created" | "updated" | "due_date" | "id";
 *   reverse?: boolean;
 *   includeClosed?: boolean;
 *   subtasks?: boolean;
 *   dateCreatedGt?: number;
 *   dateCreatedLt?: number;
 * }} opts
 */
export async function fetchFilteredTeamTasks(opts) {
  const {
    token,
    teamId,
    spaceIds = [],
    page = 0,
    orderBy = "created",
    reverse = true,
    includeClosed = true,
    subtasks = true,
    dateCreatedGt,
    dateCreatedLt,
  } = opts;

  /** @type {Record<string, string | number | boolean | Array<string | number>>} */
  const query = {
    page,
    order_by: orderBy,
    reverse: reverse ? "true" : "false",
    include_closed: includeClosed ? "true" : "false",
    subtasks: subtasks ? "true" : "false",
  };

  if (spaceIds.length) {
    query["space_ids[]"] = spaceIds.map(String);
  }
  if (dateCreatedGt != null && Number.isFinite(dateCreatedGt)) {
    query.date_created_gt = Math.floor(dateCreatedGt);
  }
  if (dateCreatedLt != null && Number.isFinite(dateCreatedLt)) {
    query.date_created_lt = Math.floor(dateCreatedLt);
  }

  const data = await clickUpGet(token, `/team/${encodeURIComponent(String(teamId))}/task`, query);
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    lastPage: data.last_page === true,
  };
}
