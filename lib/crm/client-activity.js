/**
 * "Seneste aktivitet" pr. kunde — formattering + demo-afledning fra static-data.
 * Database-varianten beregnes i `lib/server/client-activity-data.js`.
 */

/**
 * @typedef {{ at: string; kind: string; label: string }} ClientActivity
 * `at` = ISO-tidspunkt, `kind` = task | comment | time | note | contract | upsell | nps | contact | commercial,
 * `label` = hvad der skete (vises ved hover).
 */

export const ACTIVITY_KIND_LABELS = /** @type {Record<string, string>} */ ({
  task: "Opgave",
  comment: "Opgavekommentar",
  time: "Tidsregistrering",
  note: "Note",
  contract: "Kontrakt",
  upsell: "Opsalg",
  nps: "NPS-svar",
  contact: "Kontakt",
  commercial: "Aftalebeløb",
});

/**
 * Relativ dansk tid: "lige nu", "12 min siden", "3 timer siden", "i går", "5 dage siden", "2 mdr. siden".
 * @param {string | Date | null | undefined} at
 * @param {Date} [now]
 */
export function formatRelativeDa(at, now = new Date()) {
  if (!at) return "—";
  const d = at instanceof Date ? at : new Date(String(at));
  if (Number.isNaN(d.getTime())) return "—";
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "lige nu";
  if (diffMin < 60) return `${diffMin} min siden`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return hours === 1 ? "1 time siden" : `${hours} timer siden`;
  const days = Math.round(hours / 24);
  if (days === 1) return "i går";
  if (days < 31) return `${days} dage siden`;
  const months = Math.round(days / 30.4);
  if (months < 12) return months === 1 ? "1 md. siden" : `${months} mdr. siden`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 år siden" : `${years} år siden`;
}

/** @param {string | Date | null | undefined} at */
export function formatDateTimeDa(at) {
  if (!at) return "";
  const d = at instanceof Date ? at : new Date(String(at));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hover-tekst: "Opgave · Opgave afsluttet: Q2-rapport · 12.05.2026 14:20".
 * @param {ClientActivity | null | undefined} activity
 */
export function activityTooltip(activity) {
  if (!activity) return "Ingen registreret aktivitet";
  const kind = ACTIVITY_KIND_LABELS[activity.kind] ?? activity.kind;
  return [kind, activity.label, formatDateTimeDa(activity.at)].filter(Boolean).join(" · ");
}

/** Parse demo-labels som "5 min siden", "2 timer siden", "1 dag siden" til minutter. */
const DEMO_LABEL_RE = /(\d+)\s*(min|time|timer|dag|dage)/i;

/** @param {string | undefined} label */
function demoLabelToMinutes(label) {
  const m = DEMO_LABEL_RE.exec(String(label ?? ""));
  if (!m) return 60 * 24 * 7;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "min") return n;
  if (unit.startsWith("time")) return n * 60;
  return n * 60 * 24;
}

/** @param {string} s */
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** @param {string} s @param {number} max */
function excerpt(s, max = 60) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Demo: tidspunkt fra kundens `lastActivity`-label, "hvad" udledt deterministisk fra kundens
 * opgaver, noter og opsalg i static-data.
 * @param {{ id: string; lastActivity?: string; upsells?: Array<{ description?: string }> }} client
 * @param {{ tasks: Array<{ clientId: string; title: string; status: string }>; notes: Array<{ type?: string; body?: string }> }} sources
 * @param {Date} [now]
 * @returns {ClientActivity}
 */
export function demoClientActivity(client, sources, now = new Date()) {
  const at = new Date(now.getTime() - demoLabelToMinutes(client.lastActivity) * 60000).toISOString();
  const tasks = sources.tasks.filter((t) => t.clientId === client.id);
  const openTask = tasks.find((t) => t.status !== "done") ?? tasks[0];
  const note = sources.notes[0];
  const upsell = client.upsells?.[0];
  /** @type {ClientActivity[]} */
  const candidates = [];
  if (openTask) candidates.push({ at, kind: "task", label: `Opgave opdateret: ${openTask.title}` });
  if (openTask) candidates.push({ at, kind: "time", label: `Tid registreret på ${openTask.title}` });
  if (note) candidates.push({ at, kind: "note", label: excerpt(note.body ?? "") });
  if (upsell) candidates.push({ at, kind: "upsell", label: `Opsalg: ${excerpt(upsell.description ?? "", 48)}` });
  if (!candidates.length) return { at, kind: "contact", label: "Kontakt med kunden" };
  return candidates[hashString(client.id) % candidates.length];
}

/**
 * Deterministiske 12-mdr. KPI-serier til demo-kundeview.
 * @param {{
 *   id: string;
 *   retainer?: number;
 *   hoursThisMonth?: number;
 *   utilisationHistory?: number[];
 *   npsHistory?: Array<{ score: number }>;
 *   startedAt?: string;
 * }} client
 * @param {Array<{ month: string; retainer: number }>} retainerHistory
 * @param {Array<{ label: string }>} months fra `lastMonths()`
 */
export function demoClientTrends(client, retainerHistory, months) {
  const seed = hashString(client.id);
  const util = Array.isArray(client.utilisationHistory) ? client.utilisationHistory : [];
  const hours = months.map((m, i) => {
    const fromHistory = util[util.length - months.length + i];
    const v =
      i === months.length - 1 ? (client.hoursThisMonth ?? 0)
      : typeof fromHistory === "number" ? fromHistory
      : 0;
    return { label: m.label, value: Math.round(v * 10) / 10 };
  });

  const scores = (client.npsHistory ?? []).map((r) => r.score);
  const nps = months.map((m, i) => {
    // Kvartalsvis NPS: ét svar hver 3. måned, sidste svar i indeværende måned.
    const fromEnd = months.length - 1 - i;
    if (fromEnd % 3 !== 0) return { label: m.label, value: null };
    const score = scores[scores.length - 1 - fromEnd / 3];
    return { label: m.label, value: typeof score === "number" ? score : null };
  });

  const tasksCreated = months.map((m, i) => ({
    label: m.label,
    value: 2 + ((seed >> (i % 16)) % 6),
  }));

  const retainerByMonth = retainerHistory.map((r) => r.retainer);
  const firstKnown = retainerByMonth[0] ?? client.retainer ?? 0;
  const mrr = months.map((m, i) => {
    const fromEnd = months.length - 1 - i;
    const v = retainerByMonth[retainerByMonth.length - 1 - fromEnd];
    return { label: m.label, value: typeof v === "number" ? v : firstKnown };
  });

  return { hours, nps, tasksCreated, mrr };
}
