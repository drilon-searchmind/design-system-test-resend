/**
 * NPS-cyklus og -berettigelse — delt mellem scheduler, send-sti og dashboard (server + klient).
 *
 * - Målinger kører i et rullende 2-måneders vindue: ingen kunde får en ny automatisk måling,
 *   hvis den har fået én inden for de seneste 2 måneder (uanset kortere interval).
 * - Kunder der er yngre end 1 måned (startedAt, ellers createdAt) får ikke NPS.
 */

/** Rullende vindue for dashboard-KPI'er og minimum mellem automatiske udsendelser. */
export const NPS_ROLLING_WINDOW_MONTHS = 2;

/** Minimum kundealder før NPS må sendes. */
export const NPS_MIN_CLIENT_AGE_MONTHS = 1;

/** Standard-interval for nye kunder og kunder uden sat interval. */
export const NPS_DEFAULT_INTERVAL = "bimonthly";

/** @type {Record<string, number>} */
export const NPS_INTERVAL_MONTHS = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

/** @param {unknown} raw */
export function effectiveNpsInterval(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s && s in NPS_INTERVAL_MONTHS ? s : NPS_DEFAULT_INTERVAL;
}

/**
 * Antal måneder mellem automatiske udsendelser for en kunde (aldrig under det rullende vindue).
 * @param {unknown} interval
 */
export function npsCadenceMonths(interval) {
  const months = NPS_INTERVAL_MONTHS[effectiveNpsInterval(interval)] ?? NPS_ROLLING_WINDOW_MONTHS;
  return Math.max(NPS_ROLLING_WINDOW_MONTHS, months);
}

/**
 * Kalender-måneder lagt til/trukket fra; dag klemmes til månedens sidste dag (31. jan − 2 → 30. nov).
 * @param {Date} date
 * @param {number} months
 */
export function addCalendarMonths(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** @param {unknown} v */
function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {Date} d */
function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {{ startedAt?: unknown; createdAt?: unknown }} client
 * @param {Date} [now]
 * @returns {{ tooNew: boolean; since: string; eligibleFrom: string }}
 */
export function npsClientAgeStatus(client, now = new Date()) {
  const since = toDate(client?.startedAt) ?? toDate(client?.createdAt);
  if (!since) return { tooNew: false, since: "", eligibleFrom: "" };
  const eligibleFrom = addCalendarMonths(since, NPS_MIN_CLIENT_AGE_MONTHS);
  return {
    tooNew: eligibleFrom.getTime() > now.getTime(),
    since: isoDay(since),
    eligibleFrom: isoDay(eligibleFrom),
  };
}

/**
 * Rullende vindue `[from, to]` + forrige vindue af samme længde (til Δ).
 * @param {Date} [now]
 */
export function npsRollingWindow(now = new Date()) {
  const to = now;
  const from = addCalendarMonths(to, -NPS_ROLLING_WINDOW_MONTHS);
  const prevFrom = addCalendarMonths(from, -NPS_ROLLING_WINDOW_MONTHS);
  return {
    from,
    to,
    prevFrom,
    prevTo: from,
    fromIso: isoDay(from),
    toIso: isoDay(to),
    prevFromIso: isoDay(prevFrom),
    prevToIso: isoDay(from),
    label: `Seneste ${NPS_ROLLING_WINDOW_MONTHS} måneder`,
  };
}

/**
 * Begrænser hver kundes `npsHistory` til svar med `respondedAt` i `[fromIso, toIso)` / `[fromIso, toIso]`.
 * @template {{ npsHistory?: { respondedAt?: string }[] }} T
 * @param {T[]} clientList
 * @param {string} fromIso inklusiv
 * @param {string} toIso inklusiv når `toInclusive`, ellers eksklusiv
 * @param {{ toInclusive?: boolean }} [opts]
 * @returns {T[]}
 */
export function npsClientsWithHistoryInWindow(clientList, fromIso, toIso, opts = {}) {
  const toInclusive = opts.toInclusive !== false;
  return clientList.map((c) => ({
    ...c,
    npsHistory: (c.npsHistory ?? []).filter((e) => {
      const d = typeof e?.respondedAt === "string" ? e.respondedAt.slice(0, 10) : "";
      if (!d || d < fromIso) return false;
      return toInclusive ? d <= toIso : d < toIso;
    }),
  }));
}
