/** @typedef {'new' | 'update' | 'unchanged' | 'skipped'} SyncKind */

/**
 * @param {unknown} value
 */
export function normalizeCompareValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(String).sort().join("|");
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value).trim();
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string[]} fields
 */
export function snapshotFields(doc, fields) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of fields) {
    out[key] = normalizeCompareValue(doc[key]);
  }
  return out;
}

/**
 * @param {Record<string, string>} current
 * @param {Record<string, string>} proposed
 * @param {string[]} fields
 */
export function diffFieldSnapshots(current, proposed, fields) {
  /** @type {Array<{ field: string; from: string; to: string }>} */
  const changes = [];
  for (const key of fields) {
    const from = current[key] ?? "";
    const to = proposed[key] ?? "";
    if (from !== to) changes.push({ field: key, from, to });
  }
  return changes;
}

/**
 * @param {{
 *   id: string;
 *   linkUrl?: string;
 *   proposed: Record<string, string> | null;
 *   current: Record<string, string> | null;
 *   compareFields: string[];
 *   skipped?: boolean;
 * }} input
 */
export function classifySyncRow(input) {
  const { id, linkUrl = "", proposed, current, compareFields, skipped = false } = input;

  if (skipped || !id || !proposed) {
    return {
      id: id || "",
      kind: /** @type {SyncKind} */ ("skipped"),
      linkUrl,
      proposed,
      current,
      changes: [],
    };
  }

  if (!current) {
    return {
      id,
      kind: /** @type {SyncKind} */ ("new"),
      linkUrl,
      proposed,
      current: null,
      changes: [],
    };
  }

  const changes = diffFieldSnapshots(current, proposed, compareFields);
  if (!changes.length) {
    return {
      id,
      kind: /** @type {SyncKind} */ ("unchanged"),
      linkUrl,
      proposed,
      current,
      changes: [],
    };
  }

  return {
    id,
    kind: /** @type {SyncKind} */ ("update"),
    linkUrl,
    proposed,
    current,
    changes,
  };
}

/**
 * @param {Array<{ kind: SyncKind }>} rows
 */
export function countSyncKinds(rows) {
  /** @type {Record<SyncKind, number>} */
  const counts = { new: 0, update: 0, unchanged: 0, skipped: 0 };
  for (const row of rows) {
    counts[row.kind] += 1;
  }
  return counts;
}
