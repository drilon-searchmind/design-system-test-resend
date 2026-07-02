/**
 * URLSearchParams for database-mode CRM API calls.
 * Omits `includeTest` so server defaults to production rows only (excludes isTest seed data).
 *
 * @param {Record<string, string | number | boolean | null | undefined>} [params]
 */
export function databaseApiQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined || val === "") continue;
    qs.set(key, String(val));
  }
  return qs;
}
