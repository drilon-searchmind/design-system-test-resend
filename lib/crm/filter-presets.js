/**
 * Saved filter presets in localStorage (versioned). ClickUp-style named views.
 * @see vercel-react-best-practices: version + minimize localStorage data.
 */

import {
  PRESET_ACTIVE_ONLY,
  PRESET_NEEDS_ATTENTION,
  PRESET_OVER_TIMEBUDGET,
} from "@/lib/crm/advanced-filter";

const VERSION = "v1";
const DEMO_SEED_FLAG = `crm-filter-demo-seeded:${VERSION}`;

/** @param {string} scope e.g. "clients-directory" */
function storageKey(scope) {
  return `crm-filter-presets:${VERSION}:${scope}`;
}

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   rules: import('@/lib/crm/advanced-filter').FilterRule[];
 *   quickFilter?: string;
 *   updatedAt: string;
 * }} FilterPreset
 */

/**
 * @param {string} scope
 * @returns {FilterPreset[]}
 */
export function loadFilterPresets(scope) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.rules))
      .map((p) => ({
        id: String(p.id),
        name: String(p.name).slice(0, 80),
        rules: p.rules,
        quickFilter: typeof p.quickFilter === "string" ? p.quickFilter : undefined,
        updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * @param {string} scope
 * @param {FilterPreset[]} presets
 */
export function saveFilterPresets(scope, presets) {
  if (typeof window === "undefined") return;
  try {
    const slim = presets.slice(0, 30).map((p) => ({
      id: p.id,
      name: p.name.slice(0, 80),
      rules: p.rules,
      quickFilter: p.quickFilter,
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
    localStorage.setItem(storageKey(scope), JSON.stringify(slim));
  } catch {
    // quota / private mode
  }
}

/**
 * Persist last-used rules for a scope (auto-restore on visit).
 * @param {string} scope
 * @param {{ rules: import('@/lib/crm/advanced-filter').FilterRule[]; quickFilter?: string; q?: string }} state
 */
export function saveLastFilterState(scope, state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `crm-filter-last:${VERSION}:${scope}`,
      JSON.stringify({
        rules: state.rules ?? [],
        quickFilter: state.quickFilter,
        q: state.q ?? "",
        at: new Date().toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} scope
 * @returns {{ rules: import('@/lib/crm/advanced-filter').FilterRule[]; quickFilter?: string; q?: string } | null}
 */
export function loadLastFilterState(scope) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`crm-filter-last:${VERSION}:${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rules)) return null;
    return {
      rules: parsed.rules,
      quickFilter: typeof parsed.quickFilter === "string" ? parsed.quickFilter : undefined,
      q: typeof parsed.q === "string" ? parsed.q : "",
    };
  } catch {
    return null;
  }
}

/**
 * First-visit demo seed for kundelisten: named presets + aktiv «Skjul stoppede».
 * Kører kun én gang pr. browser (flag i localStorage). `force` oversætter ved tests.
 *
 * @param {{ force?: boolean }} [opts]
 * @returns {{ seeded: boolean; activeRules: import('@/lib/crm/advanced-filter').FilterRule[] }}
 */
export function ensureDemoClientFilterSeed(opts = {}) {
  if (typeof window === "undefined") {
    return { seeded: false, activeRules: [] };
  }

  try {
    const already = localStorage.getItem(DEMO_SEED_FLAG) === "1";
    const last = loadLastFilterState("clients-directory");
    const existing = loadFilterPresets("clients-directory");

    // Skip if already seeded and user has some state — unless force
    if (!opts.force && already && (last || existing.length > 0)) {
      return { seeded: false, activeRules: last?.rules ?? [] };
    }

    const now = new Date().toISOString();
    /** @type {FilterPreset[]} */
    const demoPresets = [
      {
        id: "demo-skjul-stoppede",
        name: "Skjul stoppede",
        rules: PRESET_ACTIVE_ONLY.rules.map((r, i) => ({ ...r, id: `demo_s_${i}` })),
        updatedAt: now,
      },
      {
        id: "demo-kraever-handling",
        name: "Kræver handling",
        rules: PRESET_NEEDS_ATTENTION.rules.map((r, i) => ({ ...r, id: `demo_h_${i}` })),
        updatedAt: now,
      },
      {
        id: "demo-over-budget",
        name: "Over timebudget",
        rules: PRESET_OVER_TIMEBUDGET.rules.map((r, i) => ({ ...r, id: `demo_b_${i}` })),
        updatedAt: now,
      },
      {
        id: "demo-hoj-margin",
        name: "Margin ≥ 25 %",
        rules: [{ id: "demo_m_0", field: "margin", op: "gte", value: 25 }],
        updatedAt: now,
      },
    ];

    const byId = new Map(existing.map((p) => [p.id, p]));
    for (const p of demoPresets) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    saveFilterPresets("clients-directory", [...byId.values()]);

    // Aktiv filter: «Skjul stoppede» — listen åbner uden inaktive/stoppede kunder
    const activeRules =
      last?.rules?.length ?
        last.rules
      : demoPresets[0].rules.map((r) => ({
          ...r,
          id: `r_${Math.random().toString(36).slice(2, 10)}`,
        }));

    if (!last?.rules?.length) {
      saveLastFilterState("clients-directory", {
        rules: activeRules,
        quickFilter: "all",
        q: "",
      });
    }

    localStorage.setItem(DEMO_SEED_FLAG, "1");
    return { seeded: true, activeRules };
  } catch {
    return { seeded: false, activeRules: [] };
  }
}
