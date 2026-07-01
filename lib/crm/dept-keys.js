import { DEPARTMENTS } from "@/lib/crm/static-data";

/** Extra disciplines used in client assignee maps but not in static DEPARTMENTS. */
export const EXTRA_DEPARTMENTS = [
  {
    id: "clientMgmt",
    name: "Client Management",
    short: "CM",
    capacity: 320,
    color: "var(--dep-ppc)",
  },
];

export const ALL_KNOWN_DEPARTMENTS = [...DEPARTMENTS, ...EXTRA_DEPARTMENTS];

/** @type {Record<string, string>} */
export const DEPT_KEY_ALIASES = {
  clientstrategy: "clientMgmt",
  clientmgmt: "clientMgmt",
  client_mgmt: "clientMgmt",
  cp: "clientMgmt",
  ps: "social",
  paid_social: "social",
  em: "email",
  cn: "content",
  cr: "creative",
  mt: "martech",
  wb: "web",
};

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeDeptKey(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (DEPT_KEY_ALIASES[lower]) return DEPT_KEY_ALIASES[lower];
  const known = ALL_KNOWN_DEPARTMENTS.find((d) => d.id === lower || d.id === s);
  return known ? known.id : lower;
}

/**
 * @param {string} deptKey
 */
export function deptMeta(deptKey) {
  const id = normalizeDeptKey(deptKey);
  return ALL_KNOWN_DEPARTMENTS.find((d) => d.id === id) ?? null;
}

/**
 * @param {string[]} keys
 */
export function deptShortLabels(keys) {
  return keys
    .map((k) => deptMeta(k)?.short ?? k)
    .filter(Boolean);
}
