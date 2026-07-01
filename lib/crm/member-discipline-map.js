import { normalizeDeptKey } from "@/lib/crm/dept-keys";

/** @param {string} raw */
export function normalizePersonName(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * @param {string} assigneeRaw
 * @param {Array<{ key: string; name: string }>} members
 * @returns {string | null} TeamMember.key
 */
export function resolveAssigneeToMemberKey(assigneeRaw, members) {
  const raw = String(assigneeRaw ?? "").trim();
  if (!raw) return null;

  const norm = normalizePersonName(raw);
  if (!norm) return null;

  const byKey = members.find((m) => m.key.toLowerCase() === raw.toLowerCase());
  if (byKey) return byKey.key;

  const exact = members.find((m) => normalizePersonName(m.name) === norm);
  if (exact) return exact.key;

  const partial = members.filter((m) => {
    const mn = normalizePersonName(m.name);
    return mn.includes(norm) || norm.includes(mn);
  });
  if (partial.length === 1) return partial[0].key;

  const firstToken = norm.split(" ")[0] ?? "";
  if (firstToken.length >= 3) {
    const byFirst = members.filter((m) => normalizePersonName(m.name).startsWith(`${firstToken} `));
    if (byFirst.length === 1) return byFirst[0].key;
  }

  return null;
}

/**
 * @param {unknown} mapLike
 * @returns {Record<string, string>}
 */
export function deptAssigneesFromClientDoc(mapLike) {
  if (!mapLike || typeof mapLike !== "object") return {};
  const raw =
    mapLike instanceof Map ? Object.fromEntries(mapLike) : /** @type {Record<string, unknown>} */ (mapLike);
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    const s = String(val ?? "").trim();
    if (s) out[key] = s;
  }
  return out;
}

/**
 * @param {Array<{ deptAssignees?: unknown }>} clients
 * @param {Array<{ key: string; name: string }>} members
 */
export function buildMemberDisciplineMap(clients, members) {
  /** @type {Map<string, Map<string, number>>} */
  const countsByMember = new Map();

  for (const client of clients) {
    const assignees = deptAssigneesFromClientDoc(client.deptAssignees);
    for (const [deptRaw, assigneeName] of Object.entries(assignees)) {
      const deptKey = normalizeDeptKey(deptRaw);
      const memberKey = resolveAssigneeToMemberKey(assigneeName, members);
      if (!memberKey || !deptKey) continue;

      if (!countsByMember.has(memberKey)) countsByMember.set(memberKey, new Map());
      const deptCounts = countsByMember.get(memberKey);
      deptCounts.set(deptKey, (deptCounts.get(deptKey) ?? 0) + 1);
    }
  }

  /** @type {Map<string, { primaryDept: string; disciplineKeys: string[]; assignmentCount: number }>} */
  const result = new Map();

  for (const [memberKey, deptCounts] of countsByMember) {
    /** @type {[string, number][]} */
    const sorted = [...deptCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const disciplineKeys = sorted.map(([k]) => k);
    const primaryDept = sorted[0]?.[0] ?? "";
    const assignmentCount = sorted.reduce((sum, [, n]) => sum + n, 0);
    if (primaryDept) {
      result.set(memberKey, { primaryDept, disciplineKeys, assignmentCount });
    }
  }

  return result;
}
