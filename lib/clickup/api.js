const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

/**
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string | number | boolean | undefined>} [query]
 */
async function clickUpGet(token, path, query = {}) {
  const url = new URL(`${CLICKUP_API_BASE}${path}`);
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== "") url.searchParams.set(key, String(val));
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
