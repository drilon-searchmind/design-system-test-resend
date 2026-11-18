/** Primært domæne for en kunde (bruges til favicon-logo). Sikker på server og klient. */

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/**
 * Normaliserer "https://www.Foo.dk/sti" → "foo.dk". Returnerer "" hvis det ikke ligner et domæne.
 * @param {unknown} raw
 */
export function normalizeDomain(raw) {
  let s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#\s]/)[0] ?? "";
  return DOMAIN_RE.test(s) ? s : "";
}

/**
 * Primært domæne → første domæne → ClickUp-opgavenavn hvis det ligner et domæne.
 * @param {{
 *   primaryDomain?: string | null;
 *   domains?: Array<{ domain?: string; isPrimary?: boolean }> | null;
 *   clickUpTaskName?: string | null;
 * } | null | undefined} client
 * @param {Array<{ domain?: string; isPrimary?: boolean }>} [fallbackDomains] fx demo-domæner fra `domainsForClient`
 */
export function resolveClientDomain(client, fallbackDomains) {
  if (!client) return "";
  const direct = normalizeDomain(client.primaryDomain);
  if (direct) return direct;
  const list = Array.isArray(client.domains) && client.domains.length ? client.domains : fallbackDomains ?? [];
  const primary = list.find((d) => d?.isPrimary && normalizeDomain(d.domain));
  if (primary) return normalizeDomain(primary.domain);
  for (const d of list) {
    const n = normalizeDomain(d?.domain);
    if (n) return n;
  }
  return normalizeDomain(client.clickUpTaskName);
}

/** @param {string} domain */
export function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
