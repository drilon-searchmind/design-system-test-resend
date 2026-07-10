const CLICKUP_API_V3 = "https://api.clickup.com/api/v3";

export const DEFAULT_KB_WORKSPACE_ID = "20450769";
export const DEFAULT_KB_DOC_ID = "kg3eh-1581";

/**
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string | number | boolean | undefined>} [query]
 */
async function clickUpV3Get(token, path, query = {}) {
  const url = new URL(`${CLICKUP_API_V3}${path}`);
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== "") url.searchParams.set(key, String(val));
  }

  let lastError = "ClickUp API error";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(url, {
      headers: { Authorization: token },
    });

    const raw = await res.text();
    /** @type {Record<string, unknown>} */
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { err: raw.slice(0, 200) };
    }

    if (res.ok) return data;

    const message =
      typeof data?.err === "string" ? data.err
      : typeof data?.message === "string" ? data.message
      : raw.slice(0, 200) || `ClickUp API ${res.status}`;
    lastError = message;

    if (res.status === 429 || res.status >= 500) {
      await sleep(500 * 2 ** attempt);
      continue;
    }

    throw new Error(message);
  }

  throw new Error(lastError);
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} token
 * @param {{ workspaceId?: string; docId?: string }} opts
 */
export async function fetchClickUpDocMeta(token, opts = {}) {
  const workspaceId = opts.workspaceId ?? DEFAULT_KB_WORKSPACE_ID;
  const docId = opts.docId ?? DEFAULT_KB_DOC_ID;
  return clickUpV3Get(token, `/workspaces/${workspaceId}/docs/${docId}`);
}

/**
 * @param {string} token
 * @param {{ workspaceId?: string; docId?: string }} opts
 */
export async function fetchClickUpDocPageTree(token, opts = {}) {
  const workspaceId = opts.workspaceId ?? DEFAULT_KB_WORKSPACE_ID;
  const docId = opts.docId ?? DEFAULT_KB_DOC_ID;
  const data = await clickUpV3Get(token, `/workspaces/${workspaceId}/docs/${docId}/pages`, {
    max_page_depth: -1,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} token
 * @param {string} pageId
 * @param {{ workspaceId?: string; docId?: string; contentFormat?: "text/md" | "text/plain" }} opts
 */
export async function fetchClickUpDocPage(token, pageId, opts = {}) {
  const workspaceId = opts.workspaceId ?? DEFAULT_KB_WORKSPACE_ID;
  const docId = opts.docId ?? DEFAULT_KB_DOC_ID;
  const contentFormat = opts.contentFormat ?? "text/md";
  return clickUpV3Get(
    token,
    `/workspaces/${workspaceId}/docs/${docId}/pages/${encodeURIComponent(pageId)}`,
    { content_format: contentFormat },
  );
}

/**
 * @param {unknown[]} pages
 * @returns {string[]}
 */
export function collectPageIdsFromTree(pages) {
  /** @type {string[]} */
  const ids = [];

  /** @param {unknown[]} list */
  function walk(list) {
    for (let i = 0; i < list.length; i += 1) {
      const row = /** @type {Record<string, unknown>} */ (list[i]);
      const id = typeof row.id === "string" ? row.id : "";
      if (id) ids.push(id);
      if (Array.isArray(row.pages) && row.pages.length) walk(row.pages);
    }
  }

  walk(pages);
  return ids;
}

/**
 * @param {number | string | undefined | null} ms
 */
export function isoFromClickUpMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString();
}

/**
 * @param {string} name
 */
export function slugifyPageName(name) {
  return String(name ?? "page")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * @param {string} workspaceId
 * @param {string} docId
 * @param {string} pageId
 */
export function clickUpDocPageUrl(workspaceId, docId, pageId) {
  return `https://app.clickup.com/${workspaceId}/v/dc/${docId}/${pageId}`;
}

/**
 * @param {string} text
 */
export function countWords(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}
