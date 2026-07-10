import { CLIENTS, SMART_ALERTS } from "./static-data";

// ClickUp stored NPS as 1–10. Agency OS uses 0–100 (score × 10).
// On migration: clickupScore * 10 = agencyOsScore
/**
 * @param {number} clickupScore
 */
export function fromClickupNps(clickupScore) {
  return Math.round(clickupScore * 10);
}

/** Konti med i NPS-rollup (aktiv + pauseret). */
/** @param {typeof CLIENTS} [clientList] */
export function npsDashboardClients(clientList = CLIENTS) {
  return clientList.filter((c) => c.status === "active" || c.status === "paused");
}

/** @param {import("./static-data").CLIENTS[number]} client */
export function npsLatestEntry(client) {
  const h = client.npsHistory;
  if (!h?.length) return null;
  return h[h.length - 1];
}

/** @param {import("./static-data").CLIENTS[number]} client */
export function npsPreviousEntry(client) {
  const h = client.npsHistory;
  if (!h || h.length < 2) return null;
  return h[h.length - 2];
}

/** @param {typeof CLIENTS} [clientList] */
export function npsActiveClientsMeasured(clientList = CLIENTS) {
  return npsDashboardClients(clientList).filter((c) => (c.npsHistory?.length ?? 0) > 0);
}

/** @param {typeof CLIENTS} [clientList] */
export function npsAgencyAverageLatest(clientList = CLIENTS) {
  const scores = npsActiveClientsMeasured(clientList).map((c) => npsLatestEntry(c)?.score).filter((x) => x != null);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** @param {typeof CLIENTS} [clientList] */
export function npsAgencyAveragePrevious(clientList = CLIENTS) {
  const scores = npsActiveClientsMeasured(clientList)
    .map((c) => npsPreviousEntry(c)?.score)
    .filter((x) => x != null);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Promoter ≥60 · passiv 40–59 · detraktor <40 — matcher KPI-toner på kundekort.
 * @returns {{ promoters: number; passive: number; detractors: number; withData: number }}
 */
/** @param {typeof CLIENTS} [clientList] */
export function npsLatestDistributionBuckets(clientList = CLIENTS) {
  let promoters = 0;
  let passive = 0;
  let detractors = 0;
  let withData = 0;
  for (const c of npsActiveClientsMeasured(clientList)) {
    const s = npsLatestEntry(c)?.score;
    if (s == null) continue;
    withData++;
    if (s >= 60) promoters++;
    else if (s >= 40) passive++;
    else detractors++;
  }
  return { promoters, passive, detractors, withData };
}

/** @param {typeof CLIENTS} [clientList] */
export function npsAtRiskLatestCount(clientList = CLIENTS) {
  return npsActiveClientsMeasured(clientList).filter((c) => (npsLatestEntry(c)?.score ?? 99) < 40).length;
}

/**
 * @param {number} [threshold]
 * @param {typeof CLIENTS} [clientList]
 */
export function npsImprovingClientsCount(threshold = 2, clientList = CLIENTS) {
  return npsActiveClientsMeasured(clientList).filter((c) => {
    const a = npsLatestEntry(c)?.score;
    const b = npsPreviousEntry(c)?.score;
    return a != null && b != null && a >= b + threshold;
  }).length;
}

export function npsSmartAlertsFiltered() {
  return SMART_ALERTS.filter((a) => a.type === "npsDrop" || /\bNPS\b/i.test(a.title));
}

/**
 * @param {number[]} base
 * @param {number | null | undefined} liveLatest
 */
export function npsMergeTrendSeries(base, liveLatest) {
  const s = [...base];
  if (liveLatest != null && Number.isFinite(liveLatest)) {
    s[s.length - 1] = Math.round(liveLatest * 10) / 10;
  }
  return s;
}

/**
 * @param {number} year 1–12 calendar month
 * @param {number} month
 */
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 12 måneders bureau-gennemsnit fra rigtig historik (ældste → nyeste).
 * For hver måned: seneste score pr. aktiv/pauseret konto med respondedAt ≤ månedens sidste dag.
 * @param {typeof CLIENTS} [clientList]
 * @param {{ year: number; month: number }} [anchorPeriod] Sidste måned i serien
 * @returns {{ values: number[]; labels: string[] }}
 */
export function npsAgencyTrendMonthly(clientList = CLIENTS, anchorPeriod) {
  const now = new Date();
  const anchor = anchorPeriod ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const clients = npsDashboardClients(clientList);

  /** @type {number[]} */
  const values = [];
  /** @type {string[]} */
  const labels = [];
  let lastKnown = /** @type {number | null} */ (null);

  for (let offset = 11; offset >= 0; offset -= 1) {
    let y = anchor.year;
    let m = anchor.month - offset;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }

    const endDay = lastDayOfMonth(y, m);
    const endIso = `${y}-${String(m).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    const endMs = new Date(`${endIso}T23:59:59.999Z`).getTime();

    /** @type {number[]} */
    const scores = [];
    for (let ci = 0; ci < clients.length; ci += 1) {
      const c = clients[ci];
      const history = c.npsHistory ?? [];
      let bestScore = /** @type {number | null} */ (null);
      let bestMs = -1;
      for (let hi = 0; hi < history.length; hi += 1) {
        const entry = history[hi];
        if (!entry?.respondedAt) continue;
        const ms = new Date(`${entry.respondedAt.slice(0, 10)}T12:00:00.000Z`).getTime();
        if (Number.isNaN(ms) || ms > endMs) continue;
        if (ms >= bestMs && typeof entry.score === "number") {
          bestMs = ms;
          bestScore = entry.score;
        }
      }
      if (bestScore != null) scores.push(bestScore);
    }

    let point = lastKnown;
    if (scores.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      point = Math.round(avg * 10) / 10;
      lastKnown = point;
    }

    values.push(point ?? 0);
    const monthNames = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    labels.push(`${monthNames[m - 1]} ${String(y).slice(2)}`);
  }

  return { values, labels };
}
