/**
 * @param {string} body
 */
export function parseNotificationContextTitle(body) {
  const text = String(body ?? "").trim();
  if (!text) return "";

  const guillemet = text.match(/«([^»]+)»/);
  if (guillemet?.[1]) return guillemet[1].trim();

  const mention = text.match(/\bnævnte dig på (.+)\.$/i);
  if (mention?.[1]) return mention[1].trim();

  const assigned = text.match(/\btildelte dig (.+)\.$/i);
  if (assigned?.[1]) return assigned[1].trim();

  return "";
}

/**
 * @param {string} body
 */
export function parseNotificationActorName(body) {
  const text = String(body ?? "").trim();
  if (!text) return "";

  const mention = text.match(/^(.+?)\s+nævnte dig på/i);
  if (mention?.[1]) return mention[1].trim();

  const assigned = text.match(/^(.+?)\s+tildelte dig/i);
  if (assigned?.[1]) return assigned[1].trim();

  return "";
}

/**
 * @param {{
 *   type?: string;
 *   body?: string;
 *   contextTitle?: string;
 *   actor?: { name?: string } | null;
 *   actorDisplayName?: string;
 * }} item
 */
export function resolveNotificationContextTitle(item) {
  const stored = typeof item.contextTitle === "string" ? item.contextTitle.trim() : "";
  if (stored) return stored;
  return parseNotificationContextTitle(item.body ?? "");
}

/**
 * @param {{
 *   body?: string;
 *   actor?: { name?: string } | null;
 *   actorDisplayName?: string;
 * }} item
 */
export function resolveNotificationActorName(item) {
  const stored = typeof item.actorDisplayName === "string" ? item.actorDisplayName.trim() : "";
  if (stored) return stored;
  if (typeof item.actor?.name === "string" && item.actor.name.trim()) return item.actor.name.trim();
  return parseNotificationActorName(item.body ?? "");
}

/**
 * @param {{
 *   type?: string;
 *   body?: string;
 *   contextTitle?: string;
 *   actor?: { name?: string; avatar?: string; hue?: number; image?: string } | null;
 *   actorDisplayName?: string;
 * }} item
 */
export function notificationMatchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    item.body,
    item.contextTitle,
    item.actorDisplayName,
    item.actor?.name,
    resolveNotificationContextTitle(item),
    resolveNotificationActorName(item),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
