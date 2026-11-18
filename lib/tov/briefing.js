/**
 * Brand Core briefing (the input form next to the material): who at the customer the brand
 * information comes from, plus an optional account owner. Shared by UI and server (pure, no I/O).
 * "Kundeansvarlig" (accountOwnerKey) is the ONLY optional field.
 */

export const TOV_CONTACT_TITLES = [
  "Direktør / CEO",
  "Marketingchef",
  "Brand manager",
  "E-commerce manager",
  "Content manager",
  "Marketingkoordinator",
  "Andet",
];

/**
 * @param {{ contactName?: unknown; contactTitle?: unknown; comment?: unknown; model?: unknown }} input
 * @returns {Record<"contactName" | "contactTitle" | "comment" | "model", string>} field → Danish message (empty = valid)
 */
export function validateTovBriefing(input) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!String(input.contactName ?? "").trim()) errors.contactName = "Udfyld kontaktperson hos kunden.";
  if (!String(input.contactTitle ?? "").trim()) errors.contactTitle = "Vælg kontaktpersonens titel.";
  if (!String(input.comment ?? "").trim()) errors.comment = "Skriv en kommentar / ekstra information til analysen.";
  if (!String(input.model ?? "").trim()) errors.model = "Vælg en AI-model.";
  return /** @type {any} */ (errors);
}

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
