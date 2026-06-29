/**
 * Slugify titles into internal stable keys (templates, etc.).
 * @param {string} title
 * @param {string} [prefix]
 */
export function slugifyStableKey(title, prefix = "item") {
  const base = String(title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${prefix}-${base || "untitled"}`.slice(0, 64);
}
