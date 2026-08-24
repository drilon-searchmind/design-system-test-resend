import {
  clickUpDocPageUrl,
  collectPageIdsFromTree,
  countWords,
  DEFAULT_KB_DOC_ID,
  DEFAULT_KB_WORKSPACE_ID,
  fetchClickUpDocMeta,
  fetchClickUpDocPage,
  fetchClickUpDocPageTree,
  isoFromClickUpMs,
} from "@/lib/clickup/knowledge-api";

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all KB pages from ClickUp API (no filesystem writes).
 * @param {{ token?: string; workspaceId?: string; docId?: string; requestDelayMs?: number }} [opts]
 */
export async function fetchClickUpKnowledgePages(opts = {}) {
  const token = opts.token ?? process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error("Missing CLICKUP_API_TOKEN");

  const workspaceId = opts.workspaceId ?? DEFAULT_KB_WORKSPACE_ID;
  const docId = opts.docId ?? DEFAULT_KB_DOC_ID;
  const requestDelayMs = opts.requestDelayMs ?? 600;

  const [docMeta, pageTree] = await Promise.all([
    fetchClickUpDocMeta(token, { workspaceId, docId }),
    fetchClickUpDocPageTree(token, { workspaceId, docId }),
  ]);

  const pageIds = collectPageIdsFromTree(pageTree);
  /** @type {Record<string, Record<string, unknown>>} */
  const pageById = {};

  for (let i = 0; i < pageIds.length; i += 1) {
    const pageId = pageIds[i];
    try {
      const page = await fetchClickUpDocPage(token, pageId, {
        workspaceId,
        docId,
        contentFormat: "text/md",
      });
      pageById[pageId] = /** @type {Record<string, unknown>} */ (page);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pageById[pageId] = { id: pageId, content: "", _fetch_error: message };
    }
    if (i < pageIds.length - 1 && requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  /** @type {Record<string, unknown>[]} */
  const flatPages = [];

  /**
   * @param {unknown[]} nodes
   * @param {number} depth
   * @param {string} parentPath
   * @param {string | null} parentName
   */
  function flatten(nodes, depth, parentPath, parentName) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = /** @type {Record<string, unknown>} */ (nodes[i]);
      const id = String(node.id ?? "");
      const name = String(node.name ?? "");
      const full = pageById[id] ?? node;
      const contentMd = typeof full.content === "string" ? full.content : "";
      const parentId = typeof full.parent_page_id === "string" ? full.parent_page_id : "";
      const pathLabel = parentPath ? `${parentPath} / ${name}` : name;

      flatPages.push({
        id,
        doc_id: docId,
        workspace_id: workspaceId,
        name,
        parent_page_id: parentId || null,
        parent_name: parentName,
        depth,
        path: pathLabel,
        sort_order: i,
        date_created: isoFromClickUpMs(full.date_created),
        date_updated: isoFromClickUpMs(full.date_updated),
        word_count: countWords(contentMd),
        content_md: contentMd,
        clickup_url: clickUpDocPageUrl(workspaceId, docId, id),
        avatar: full.avatar ?? null,
      });

      const children = Array.isArray(node.pages) ? node.pages : [];
      if (children.length) flatten(children, depth + 1, pathLabel, name);
    }
  }

  flatten(pageTree, 0, "", null);

  return {
    pages: flatPages,
    docMeta,
    workspaceId,
    docId,
    docName: String(docMeta.name ?? "Knowledge Base"),
    pageCount: flatPages.length,
  };
}
