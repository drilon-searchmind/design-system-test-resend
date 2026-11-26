/**
 * ClickUp-lignende filtermotor: felt + operator + værdi, AND mellem regler.
 * Genbrugelig på tværs af lister (kunder, opgaver, …).
 */

import { ALL_KNOWN_DEPARTMENTS } from "@/lib/crm/dept-keys";
import { resolveAssigneeToMemberKey } from "@/lib/crm/member-discipline-map";

/** @typedef {'is' | 'is_not' | 'is_any_of' | 'is_none_of' | 'contains' | 'not_contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between' | 'is_empty' | 'is_not_empty'} FilterOp */

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   type: 'enum' | 'multi_enum' | 'text' | 'number' | 'boolean';
 *   options?: { value: string; label: string }[];
 *   displayScale?: number;
 * }} FilterFieldDef
 */

/**
 * @typedef {{
 *   id: string;
 *   field: string;
 *   op: FilterOp;
 *   value?: string | number | boolean | string[] | null;
 *   valueTo?: number | null;
 * }} FilterRule
 */

/** @param {FilterFieldDef} field */
export function opsForField(field) {
  if (field.type === "enum" || field.type === "multi_enum") {
    return [
      { id: "is", label: "er" },
      { id: "is_not", label: "er ikke" },
      { id: "is_any_of", label: "er en af" },
      { id: "is_none_of", label: "er ingen af" },
      { id: "is_empty", label: "er tom" },
      { id: "is_not_empty", label: "er ikke tom" },
    ];
  }
  if (field.type === "text") {
    return [
      { id: "contains", label: "indeholder" },
      { id: "not_contains", label: "indeholder ikke" },
      { id: "is", label: "er" },
      { id: "is_not", label: "er ikke" },
      { id: "is_empty", label: "er tom" },
      { id: "is_not_empty", label: "er ikke tom" },
    ];
  }
  if (field.type === "number") {
    return [
      { id: "eq", label: "=" },
      { id: "gt", label: ">" },
      { id: "gte", label: "≥" },
      { id: "lt", label: "<" },
      { id: "lte", label: "≤" },
      { id: "between", label: "mellem" },
      { id: "is_empty", label: "er tom" },
      { id: "is_not_empty", label: "er ikke tom" },
    ];
  }
  if (field.type === "boolean") {
    return [
      { id: "is", label: "er" },
      { id: "is_not", label: "er ikke" },
    ];
  }
  return [{ id: "is", label: "er" }];
}

/** @param {unknown} v */
function asStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** @param {unknown} v */
function asNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", ".").replace("%", "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** @param {unknown} v */
function asList(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v == null || v === "") return [];
  return [String(v)];
}

/**
 * @param {unknown} raw
 * @param {FilterRule} rule
 * @param {FilterFieldDef | undefined} field
 */
function matchRule(raw, rule, field) {
  const op = rule.op;
  const empty =
    raw == null ||
    raw === "" ||
    (Array.isArray(raw) && raw.length === 0);

  if (op === "is_empty") return empty;
  if (op === "is_not_empty") return !empty;

  if (field?.type === "number") {
    let n = asNum(raw);
    if (n == null) return false;
    // stored margin is 0–1; UI often uses percent
    if (field.displayScale === 100 && Math.abs(n) <= 1.5) n = n * 100;
    const target = asNum(rule.value);
    const targetTo = asNum(rule.valueTo);
    if (op === "between") {
      if (target == null || targetTo == null) return true;
      return n >= Math.min(target, targetTo) && n <= Math.max(target, targetTo);
    }
    if (target == null) return true;
    if (op === "eq") return n === target;
    if (op === "gt") return n > target;
    if (op === "gte") return n >= target;
    if (op === "lt") return n < target;
    if (op === "lte") return n <= target;
    return true;
  }

  if (field?.type === "boolean") {
    const b = Boolean(raw);
    const want = rule.value === true || rule.value === "true" || rule.value === 1 || rule.value === "1";
    if (op === "is") return b === want;
    if (op === "is_not") return b !== want;
    return true;
  }

  const list = asList(rule.value).map((x) => x.toLowerCase());
  const one = asStr(rule.value).toLowerCase();

  // Multi-value row fields (fx flere assignees): match hvis nogen værdi rammer
  if (Array.isArray(raw) && (field?.type === "enum" || field?.type === "multi_enum")) {
    const values = raw.map((x) => String(x).toLowerCase());
    if (op === "is") return one ? values.includes(one) : false;
    if (op === "is_not") return one ? !values.includes(one) : true;
    if (op === "is_any_of") return list.length ? list.some((v) => values.includes(v)) : true;
    if (op === "is_none_of") return list.length ? !list.some((v) => values.includes(v)) : true;
    if (op === "contains") return one ? values.some((v) => v.includes(one)) : true;
    if (op === "not_contains") return one ? !values.some((v) => v.includes(one)) : true;
    return true;
  }

  const s = asStr(raw).toLowerCase();

  if (op === "is") return s === one;
  if (op === "is_not") return s !== one;
  if (op === "contains") return one ? s.includes(one) : true;
  if (op === "not_contains") return one ? !s.includes(one) : true;
  if (op === "is_any_of") return list.length ? list.includes(s) : true;
  if (op === "is_none_of") return list.length ? !list.includes(s) : true;
  return true;
}

/**
 * @param {T[]} rows
 * @param {FilterRule[]} rules
 * @param {Record<string, (row: T) => unknown>} accessors
 * @param {FilterFieldDef[]} fields
 * @template T
 */
export function applyFilterRules(rows, rules, accessors, fields) {
  const active = (rules ?? []).filter((r) => r && r.field && r.op);
  if (!active.length) return rows;
  const byId = new Map(fields.map((f) => [f.id, f]));
  return rows.filter((row) =>
    active.every((rule) => {
      const get = accessors[rule.field];
      if (!get) return true;
      return matchRule(get(row), rule, byId.get(rule.field));
    }),
  );
}

/** @returns {FilterRule} */
export function createEmptyRule(fieldId = "") {
  return {
    id: `r_${Math.random().toString(36).slice(2, 10)}`,
    field: fieldId,
    op: "is",
    value: "",
    valueTo: null,
  };
}

/** Feltdefinitioner til kundelisten (Alle kunder / Pulse). */
/**
 * Ejer + serviceansvarlige (deptAssignees) som member-keys — til filteret
 * "Medarbejder / serviceansvarlig".
 * @param {Record<string, any>} client
 * @param {Array<{ id?: string; key?: string; name: string }>} [team]
 * @returns {string[]}
 */
export function collectServiceOwnerKeys(client, team = []) {
  /** @type {Set<string>} */
  const keys = new Set();
  const members = team.map((t) => ({
    key: String(t.key ?? t.id ?? ""),
    name: String(t.name ?? ""),
  })).filter((m) => m.key);

  /** @param {Record<string, any>} row */
  const collect = (row) => {
    if (row.owner) keys.add(String(row.owner));
    for (const raw of Object.values(row.deptAssignees ?? {})) {
      const s = String(raw ?? "").trim();
      if (!s) continue;
      keys.add(s);
      const resolved = resolveAssigneeToMemberKey(s, members);
      if (resolved) keys.add(resolved);
    }
  };
  collect(client);
  if (Array.isArray(client.brands)) {
    for (const b of client.brands) collect(b);
  }
  return [...keys];
}

export function clientDirectoryFilterFields(team = []) {
  const memberOpts = team.map((t) => ({ value: String(t.id), label: String(t.name) }));
  return [
    {
      id: "status",
      label: "Status",
      type: "enum",
      options: [
        { value: "active", label: "Aktiv" },
        { value: "paused", label: "Pause" },
        { value: "inactive", label: "Inaktiv / tabt" },
      ],
    },
    {
      id: "owner",
      label: "Ejer",
      type: "enum",
      options: memberOpts,
    },
    {
      id: "serviceOwner",
      label: "Medarbejder / serviceansvarlig",
      type: "enum",
      options: memberOpts,
    },
    {
      id: "service",
      label: "Service",
      type: "multi_enum",
      options: ALL_KNOWN_DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })),
    },
    {
      id: "health",
      label: "Sundhed",
      type: "enum",
      options: [
        { value: "ok", label: "OK" },
        { value: "warn", label: "Advarsel" },
        { value: "bad", label: "Kritisk" },
      ],
    },
    {
      id: "industry",
      label: "Branche",
      type: "text",
    },
    {
      id: "retainer",
      label: "Retainer (kr)",
      type: "number",
    },
    {
      id: "margin",
      label: "Margin (%)",
      type: "number",
      displayScale: 100,
    },
    {
      id: "nps",
      label: "Seneste NPS",
      type: "number",
    },
    {
      id: "indeks",
      label: "Indeks",
      type: "number",
    },
    {
      id: "overBudget",
      label: "Over timebudget",
      type: "boolean",
      options: [
        { value: "true", label: "Ja" },
        { value: "false", label: "Nej" },
      ],
    },
  ];
}

/** @type {Record<string, (row: any) => unknown>} */
export const CLIENT_DIRECTORY_ACCESSORS = {
  status: (c) => c.status,
  owner: (c) => c.owner,
  serviceOwner: (c) => collectServiceOwnerKeys(c),
  service: (c) => {
    const own = Array.isArray(c.servicesActive) ? c.servicesActive.map(String) : [];
    if (!Array.isArray(c.brands)) return own;
    return [...new Set([...own, ...c.brands.flatMap((b) => (b.servicesActive ?? []).map(String))])];
  },
  health: (c) => c.health,
  industry: (c) => c.industry ?? "",
  retainer: (c) => c.retainer,
  margin: (c) => c.monthlyProfitMargin,
  nps: (c) => c.latestNps,
  indeks: (c) => c.indeks,
  overBudget: (c) =>
    typeof c.hoursBudget === "number" && c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget,
};

/**
 * Accessors med team, så serviceansvarlige kan matches på member-key selv når
 * ClickUp har gemt display-navne i `deptAssignees`.
 * @param {Array<{ id?: string; key?: string; name: string }>} [team]
 */
export function clientDirectoryAccessors(team = []) {
  return {
    ...CLIENT_DIRECTORY_ACCESSORS,
    serviceOwner: (c) => collectServiceOwnerKeys(c, team),
  };
}

/** Hurtig-preset: skjul stoppede (inaktive) kunder. */
export const PRESET_ACTIVE_ONLY = {
  id: "preset-active-only",
  name: "Skjul stoppede",
  rules: [{ id: "p1", field: "status", op: "is_not", value: "inactive" }],
};

export const PRESET_ACTIVE_AND_PAUSED = {
  id: "preset-active-paused",
  name: "Aktive + pause",
  rules: [{ id: "p1", field: "status", op: "is_any_of", value: ["active", "paused"] }],
};

export const PRESET_NEEDS_ATTENTION = {
  id: "preset-needs-attention",
  name: "Kræver handling",
  rules: [
    { id: "p1", field: "status", op: "is_not", value: "inactive" },
    { id: "p2", field: "health", op: "is_any_of", value: ["warn", "bad"] },
  ],
};

export const PRESET_OVER_TIMEBUDGET = {
  id: "preset-over-budget",
  name: "Over timebudget",
  rules: [{ id: "p1", field: "overBudget", op: "is", value: "true" }],
};

export const PRESET_LOST_CLIENTS = {
  id: "preset-lost",
  name: "Tabte / stoppede",
  rules: [{ id: "p1", field: "status", op: "is", value: "inactive" }],
};

/** Built-in presets til kundelisten. */
export const CLIENT_DIRECTORY_BUILTIN_PRESETS = [
  PRESET_ACTIVE_ONLY,
  PRESET_ACTIVE_AND_PAUSED,
  PRESET_LOST_CLIENTS,
  PRESET_NEEDS_ATTENTION,
  PRESET_OVER_TIMEBUDGET,
];

/**
 * Feltdefinitioner til opgavelisten.
 * @param {{ id: string; name: string }[]} [clients]
 * @param {{ id: string; name: string }[]} [team]
 */
export function taskDirectoryFilterFields(clients = [], team = []) {
  return [
    {
      id: "status",
      label: "Status",
      type: "enum",
      options: [
        { value: "todo", label: "Todo" },
        { value: "doing", label: "I gang" },
        { value: "review", label: "Review" },
        { value: "done", label: "Færdig" },
        { value: "blocked", label: "Blokeret" },
        { value: "cancelled", label: "Annulleret" },
      ],
    },
    {
      id: "priority",
      label: "Prioritet",
      type: "enum",
      options: [
        { value: "high", label: "Høj" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Lav" },
      ],
    },
    {
      id: "assignee",
      label: "Ansvarlig",
      type: "enum",
      options: [
        { value: "__unassigned__", label: "Ikke tildelt" },
        ...team.map((t) => ({ value: String(t.id), label: String(t.name) })),
      ],
    },
    {
      id: "client",
      label: "Kunde",
      type: "enum",
      options: clients.map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    {
      id: "title",
      label: "Titel",
      type: "text",
    },
    {
      id: "overdue",
      label: "Overskredet",
      type: "boolean",
      options: [
        { value: "true", label: "Ja" },
        { value: "false", label: "Nej" },
      ],
    },
    {
      id: "billable",
      label: "Fakturerbar",
      type: "boolean",
      options: [
        { value: "true", label: "Ja" },
        { value: "false", label: "Nej" },
      ],
    },
  ];
}

/**
 * @param {string} [refIso]
 * @returns {Record<string, (row: any) => unknown>}
 */
export function taskDirectoryAccessors(refIso) {
  return {
    status: (t) => t.status,
    priority: (t) => t.priority,
    assignee: (t) => {
      const ids =
        Array.isArray(t.assigneeIds) && t.assigneeIds.length ?
          t.assigneeIds.map(String)
        : t.assigneeId?.trim() ?
          [String(t.assigneeId).trim()]
        : [];
      return ids.length ? ids : ["__unassigned__"];
    },
    client: (t) => t.clientId || t.clientName || "",
    title: (t) => t.title ?? "",
    overdue: (t) => {
      if (!t.dueDate || String(t.dueDate).trim() === "") return false;
      const done = t.status === "done" || t.status === "cancelled";
      const ref = refIso || new Date().toISOString().slice(0, 10);
      return !done && t.dueDate < ref;
    },
    billable: (t) => Boolean(t.billable),
  };
}

export const PRESET_TASKS_OPEN = {
  id: "preset-tasks-open",
  name: "Åbne opgaver",
  rules: [
    {
      id: "p1",
      field: "status",
      op: "is_any_of",
      value: ["todo", "doing", "review", "blocked"],
    },
  ],
};

export const PRESET_TASKS_HIGH_PRIO = {
  id: "preset-tasks-high",
  name: "Høj prioritet",
  rules: [{ id: "p1", field: "priority", op: "is", value: "high" }],
};

export const PRESET_TASKS_OVERDUE = {
  id: "preset-tasks-overdue",
  name: "Overskredet",
  rules: [{ id: "p1", field: "overdue", op: "is", value: "true" }],
};

export const TASK_DIRECTORY_BUILTIN_PRESETS = [
  PRESET_TASKS_OPEN,
  PRESET_TASKS_HIGH_PRIO,
  PRESET_TASKS_OVERDUE,
];
