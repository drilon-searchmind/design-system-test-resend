/** Beregninger til Pulse-KPI-kortene (MRR-bro, margin-fordeling). */

/** @param {string | undefined | null} iso "YYYY-MM-DD" → "YYYY-MM" */
function ymOf(iso) {
  return typeof iso === "string" && iso.length >= 7 ? iso.slice(0, 7) : "";
}

/** @param {string} ym @param {number} delta */
export function shiftMonthKey(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * @typedef {object} MrrBridge
 * @property {number} start MRR ved periodens start
 * @property {number} newMrr Nye kunder startet i perioden
 * @property {number} increases Faste MRR-stigninger (opsalg) i perioden
 * @property {number} churn Kunder der stoppede i perioden (positivt tal)
 * @property {number} adjustments Øvrige ændringer (prisreguleringer m.m.) — kun med snapshot
 * @property {number} end MRR nu
 * @property {"snapshot" | "derived"} startSource
 * @property {{ id: string; name: string; amount: number }[]} newClients
 * @property {{ id: string; name: string; amount: number }[]} churned
 * @property {{ id: string; name: string; amount: number }[]} increaseItems
 */

/**
 * MRR-bro: start + nye + opsalg − churn (+ justeringer) = nu.
 * Uden snapshot udledes start fra de kendte ændringer (så justeringer = 0).
 *
 * @param {Array<Record<string, any>>} clients brand-niveau klienter
 * @param {string} ym "YYYY-MM"
 * @param {number | null} [prevSnapshotMrr] gemt MRR for forrige måned
 * @returns {MrrBridge}
 */
export function buildMrrBridge(clients, ym, prevSnapshotMrr = null) {
  const end = clients.filter((c) => c.status === "active").reduce((s, c) => s + (Number(c.retainer) || 0), 0);

  const newClients = clients
    .filter((c) => c.status === "active" && ymOf(c.startedAt) === ym)
    .map((c) => ({ id: String(c.id), name: String(c.name), amount: Number(c.retainer) || 0 }));
  const churned = clients
    .filter((c) => c.status !== "active" && ymOf(c.terminatedAt) === ym)
    .map((c) => ({ id: String(c.id), name: String(c.name), amount: Number(c.retainer) || 0 }));
  const increaseItems = clients.flatMap((c) =>
    (c.upsells ?? [])
      .filter((u) => u.type === "mrr_increase" && u.periodFrom === ym)
      .map((u) => ({ id: String(u.id), name: String(c.name), amount: Number(u.amount) || 0 })),
  );

  const newMrr = newClients.reduce((s, x) => s + x.amount, 0);
  const churn = churned.reduce((s, x) => s + x.amount, 0);
  const increases = increaseItems.reduce((s, x) => s + x.amount, 0);

  const hasSnapshot = typeof prevSnapshotMrr === "number" && Number.isFinite(prevSnapshotMrr);
  const start = hasSnapshot ? /** @type {number} */ (prevSnapshotMrr) : end - newMrr - increases + churn;
  const adjustments = end - start - newMrr - increases + churn;

  return {
    start,
    newMrr,
    increases,
    churn,
    adjustments: hasSnapshot ? adjustments : 0,
    end,
    startSource: hasSnapshot ? "snapshot" : "derived",
    newClients,
    churned,
    increaseItems,
  };
}

export const MARGIN_BANDS = [
  { id: "neg", label: "Under 0 %", min: -Infinity, max: 0, tone: "bg-agency-bad" },
  { id: "low", label: "0–15 %", min: 0, max: 0.15, tone: "bg-agency-warn" },
  { id: "mid", label: "15–30 %", min: 0.15, max: 0.3, tone: "bg-agency-ok/70" },
  { id: "high", label: "Over 30 %", min: 0.3, max: Infinity, tone: "bg-agency-ok" },
];

/**
 * Fordeling af aktive kunders margin i bånd.
 * @param {Array<Record<string, any>>} clients
 */
export function buildMarginBands(clients) {
  const active = clients.filter((c) => c.status === "active" && typeof c.monthlyProfitMargin === "number");
  return MARGIN_BANDS.map((b) => {
    const items = active
      .filter((c) => c.monthlyProfitMargin >= b.min && c.monthlyProfitMargin < b.max)
      .sort((a, c) => a.monthlyProfitMargin - c.monthlyProfitMargin)
      .map((c) => ({ id: String(c.id), name: String(c.name), margin: c.monthlyProfitMargin }));
    return { ...b, count: items.length, items };
  });
}