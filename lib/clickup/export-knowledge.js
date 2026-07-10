import fs from "node:fs/promises";
import path from "node:path";

import { rowsToCsv } from "@/lib/clickup/csv";
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
  slugifyPageName,
} from "@/lib/clickup/knowledge-api";

const CSV_COLUMNS = [
  "id",
  "name",
  "parent_page_id",
  "parent_name",
  "depth",
  "path",
  "sort_order",
  "date_created",
  "date_updated",
  "word_count",
  "content_md",
  "clickup_url",
  "avatar",
];

/**
 * @param {unknown[]} pages
 * @param {Record<string, { name: string; parent_page_id?: string | null }>} pageIndex
 * @param {string} [parentPath]
 * @param {number} [depth]
 */
function buildTreeOutline(pages, pageIndex, parentPath = "", depth = 0) {
  return pages.map((raw, index) => {
    const row = /** @type {Record<string, unknown>} */ (raw);
    const id = String(row.id ?? "");
    const name = String(row.name ?? "");
    const pathSegments = parentPath ? `${parentPath} / ${name}` : name;
    pageIndex[id] = {
      name,
      parent_page_id: typeof row.parent_page_id === "string" ? row.parent_page_id : null,
    };
    const children = Array.isArray(row.pages) ? row.pages : [];
    return {
      id,
      name,
      parent_page_id: typeof row.parent_page_id === "string" ? row.parent_page_id : null,
      depth,
      sort_order: index,
      path: pathSegments,
      date_created: isoFromClickUpMs(row.date_created),
      date_updated: isoFromClickUpMs(row.date_updated),
      avatar: row.avatar ?? null,
      children_count: children.length,
      children: buildTreeOutline(children, pageIndex, pathSegments, depth + 1),
    };
  });
}

/**
 * @param {{
 *   token?: string;
 *   workspaceId?: string;
 *   docId?: string;
 *   outDir?: string;
 *   requestDelayMs?: number;
 * }} [opts]
 */
export async function exportClickUpKnowledgeBase(opts = {}) {
  const token = opts.token ?? process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error("Missing CLICKUP_API_TOKEN in environment");

  const workspaceId = opts.workspaceId ?? DEFAULT_KB_WORKSPACE_ID;
  const docId = opts.docId ?? DEFAULT_KB_DOC_ID;
  const outDir = opts.outDir ?? path.join(process.cwd(), "data", "clickup-export-knowledge");
  const requestDelayMs = opts.requestDelayMs ?? 600;

  const pagesDir = path.join(outDir, "pages-md");
  await fs.mkdir(pagesDir, { recursive: true });

  const [docMeta, pageTree] = await Promise.all([
    fetchClickUpDocMeta(token, { workspaceId, docId }),
    fetchClickUpDocPageTree(token, { workspaceId, docId }),
  ]);

  /** @type {Record<string, { name: string; parent_page_id?: string | null }>} */
  const pageIndex = {};
  const treeOutline = buildTreeOutline(pageTree, pageIndex);

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
      console.warn(`[clickup-kb] Failed page ${pageId}: ${message}`);
      pageById[pageId] = { id: pageId, content: "", _fetch_error: message };
    }
    if (i < pageIds.length - 1 && requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
    if ((i + 1) % 10 === 0) {
      console.log(`[clickup-kb] Fetched ${i + 1}/${pageIds.length} pages…`);
    }
  }

  /** @type {Record<string, unknown>[]} */
  const flatPages = [];

  /** @param {unknown[]} nodes @param {number} depth @param {string} parentPath @param {string | null} parentName */
  async function flatten(nodes, depth, parentPath, parentName) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = /** @type {Record<string, unknown>} */ (nodes[i]);
      const id = String(node.id ?? "");
      const name = String(node.name ?? "");
      const full = pageById[id] ?? node;
      const contentMd = typeof full.content === "string" ? full.content : "";
      const parentId = typeof full.parent_page_id === "string" ? full.parent_page_id : "";
      const pathLabel = parentPath ? `${parentPath} / ${name}` : name;

      const record = {
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
      };

      flatPages.push(record);

      const fileSlug = `${slugifyPageName(name) || "page"}__${id.replace(/[^a-z0-9-]/gi, "-")}`;
      const mdBody = [
        `# ${name}`,
        "",
        `> Exported from ClickUp Knowledge Base`,
        `> Source: ${record.clickup_url}`,
        `> Updated: ${record.date_updated || "—"}`,
        "",
        contentMd || "_No content_",
        "",
      ].join("\n");
      await fs.writeFile(path.join(pagesDir, `${fileSlug}.md`), mdBody, "utf8");

      const children = Array.isArray(node.pages) ? node.pages : [];
      if (children.length) await flatten(children, depth + 1, pathLabel, name);
    }
  }

  await flatten(pageTree, 0, "", null);

  /** @type {Record<string, string>[]} */
  const csvRows = flatPages.map((p) => {
    /** @type {Record<string, string>} */
    const row = {};
    for (const col of CSV_COLUMNS) {
      const val = p[col];
      if (val == null) row[col] = "";
      else if (typeof val === "object") row[col] = JSON.stringify(val);
      else row[col] = String(val);
    }
    return row;
  });

  const exportedAt = new Date().toISOString();
  const manifest = {
    exported_at: exportedAt,
    source: {
      workspace_id: workspaceId,
      doc_id: docId,
      doc_name: String(docMeta.name ?? "Knowledge Base"),
      clickup_url: `https://app.clickup.com/${workspaceId}/v/dc/${docId}`,
      page_url_example: clickUpDocPageUrl(workspaceId, docId, "kg3eh-641"),
    },
    stats: {
      top_level_pages: pageTree.length,
      total_pages: flatPages.length,
    },
    files: {
      manifest: "manifest.json",
      tree: "knowledge-base-tree.json",
      pages_flat: "knowledge-base-pages.json",
      pages_csv: "knowledge-base-pages.csv",
      pages_markdown_dir: "pages-md/",
    },
  };

  const payload = {
    manifest,
    doc: docMeta,
    tree: treeOutline,
    pages: flatPages,
  };

  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "knowledge-base-tree.json"), JSON.stringify(treeOutline, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "knowledge-base-pages.json"), JSON.stringify(flatPages, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "knowledge-base-pages.csv"), rowsToCsv(CSV_COLUMNS, csvRows), "utf8");
  await fs.writeFile(path.join(outDir, "knowledge-base-full.json"), JSON.stringify(payload, null, 2), "utf8");

  await fs.writeFile(
    path.join(outDir, "README.md"),
    `# ClickUp Knowledge Base export

Exported **${exportedAt}** from ClickUp doc **${manifest.source.doc_name}**.

| File | Description |
|------|-------------|
| \`manifest.json\` | Export metadata and file index |
| \`knowledge-base-tree.json\` | Sidebar hierarchy (no page bodies) |
| \`knowledge-base-pages.json\` | Flat list of all ${flatPages.length} pages with markdown content |
| \`knowledge-base-pages.csv\` | Same data in CSV (open in Excel/Sheets) |
| \`knowledge-base-full.json\` | Combined manifest + doc + tree + pages |
| \`pages-md/\` | One \`.md\` file per page for quick reading |

**ClickUp source:** [${manifest.source.clickup_url}](${manifest.source.clickup_url})

Re-export:

\`\`\`bash
npm run fetch-clickup-knowledge
\`\`\`
`,
    "utf8",
  );

  return {
    outDir,
    manifest,
    pageCount: flatPages.length,
  };
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
