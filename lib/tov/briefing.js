/** Brand Core helpers shared by UI and server (pure, no I/O). */

/**
 * Normalise a domain/URL to a bare hostname without "www." for duplicate checks.
 * @param {unknown} raw
 */
export function tovHostKey(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  try {
    return new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, "");
  } catch {
    return s.replace(/^www\./, "").split("/")[0];
  }
}
