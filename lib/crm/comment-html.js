/**
 * HTML helpers for task comments — sanitize, mention extraction.
 */

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeCommentHtml(html) {
  const raw = String(html ?? "").trim();
  if (!raw) return "";

  let out = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag, attrs) => {
    const t = String(tag).toLowerCase();
    const allowed = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "span", "div"];
    if (!allowed.includes(t)) return "";
    if (t === "span") {
      const mkMatch = String(attrs).match(/data-member-key\s*=\s*"([^"]+)"/i);
      if (!mkMatch?.[1]) return "";
      const mk = mkMatch[1].trim();
      const labelMatch = full.match(/>([^<]*)</);
      const label = labelMatch?.[1] ?? `@${mk}`;
      return `<span class="mention" data-member-key="${mk}" contenteditable="false">${label}</span>`;
    }
    if (t === "br") return "<br>";
    if (full.startsWith("</")) return `</${t}>`;
    return `<${t}>`;
  });

  return out.trim();
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractMentionedMemberKeys(html) {
  const keys = new Set();
  const re = /data-member-key="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const k = m[1]?.trim();
    if (k) keys.add(k);
  }
  return [...keys];
}

/**
 * @param {string} html
 * @returns {string}
 */
export function commentHtmlToPlainText(html) {
  const s = String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  return s;
}

/**
 * @param {string} taskId
 * @param {string} [commentId]
 */
export function taskCommentHref(taskId, commentId) {
  const base = `/tasks/${encodeURIComponent(taskId)}?tab=kommentarer`;
  if (commentId) return `${base}#comment-${encodeURIComponent(commentId)}`;
  return base;
}

/**
 * @param {string} taskId
 */
export function taskDetailHref(taskId) {
  return `/tasks/${encodeURIComponent(taskId)}`;
}
