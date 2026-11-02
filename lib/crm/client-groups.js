/**
 * Koncern / kunde-grupper — brands med samme CVR behandles som én kunde.
 *
 * - Hvert brand er stadig sin egen `Client` (opgaver, tid, kontrakter hænger på brandet).
 * - Gruppen er altid *afledt* af CVR (ingen manuel sync): to eller flere klienter med samme
 *   gyldige CVR = én koncern. Gruppenavn/kundeinfo ligger valgfrit i `ClientGroup`.
 * - Rene funktioner (ingen DB/React) så server, klient og demo-data deler samme logik.
 */

import { routes } from "@/config/routes";

/** URL-segment under /clients (`/clients/koncern/{cvr}`). */
export const CLIENT_GROUP_ROUTE_SEGMENT = "koncern";

/** Prefix på entitets-id for en koncern-række (adskiller den fra brand-slugs). */
export const CLIENT_GROUP_ID_PREFIX = "koncern-";

/** @type {Record<string, number>} */
const HEALTH_RANK = { ok: 0, warn: 1, bad: 2 };

/**
 * Normaliserer et CVR til 8 cifre. Returnerer "" hvis ugyldigt (så det aldrig grupperer ved en fejl).
 * @param {unknown} raw
 */
export function normalizeCvr(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  if (/^(\d)\1{7}$/.test(digits)) return "";
  return digits;
}

/** Markerer et brand som bevidst selvstændigt (ingen koncern, selv med delt CVR). */
export const GROUP_KEY_SOLO = "-";

const EXPLICIT_GROUP_KEY = /^g-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Koncern-nøgle: enten et 8-cifret CVR eller en manuel gruppe (`g-navn-xxxx`) på tværs af CVR'er.
 * Returnerer "" hvis ugyldig.
 * @param {unknown} raw
 */
export function normalizeGroupKey(raw) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (EXPLICIT_GROUP_KEY.test(text) && text.length <= 64) return text;
  return normalizeCvr(text);
}

/**
 * Hvilken koncern et brand hører til. Manuel `groupKey` vinder over CVR;
 * `groupKey = "-"` betyder bevidst selvstændig.
 * @param {{ cvr?: string | null; groupKey?: string | null }} c
 */
export function clientGroupKey(c) {
  const explicit = String(c.groupKey ?? "").trim();
  if (explicit === GROUP_KEY_SOLO) return "";
  if (explicit) return normalizeGroupKey(explicit);
  return normalizeCvr(c.cvr);
}

/** @param {unknown} cvr Koncern-nøgle (CVR eller manuel gruppe) */
export function clientGroupHref(cvr) {
  const key = normalizeGroupKey(cvr);
  return key ? `${routes.clients}/${CLIENT_GROUP_ROUTE_SEGMENT}/${key}` : routes.clients;
}

/** @param {number} a @param {number} b */
function num(a, b = 0) {
  return typeof a === "number" && Number.isFinite(a) ? a : b;
}

/**
 * @param {{ retainer?: number; name?: string }} a
 * @param {{ retainer?: number; name?: string }} b
 */
function byRetainerDesc(a, b) {
  const diff = num(b.retainer) - num(a.retainer);
  if (diff !== 0) return diff;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""), "da");
}

/** @param {string} name */
function initialsFromName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Fallback-navn når koncernen ikke har fået et eget navn endnu.
 * @param {{ name: string; retainer?: number }[]} members
 */
export function defaultGroupName(members) {
  const sorted = [...members].sort(byRetainerDesc);
  const names = sorted.map((m) => String(m.name ?? "").trim()).filter(Boolean);
  if (!names.length) return "Koncern";
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} + ${names.length - 1} brands`;
}

/**
 * Marker klienter der deler gyldigt CVR med mindst én anden klient.
 * @template {{ cvr?: string | null; groupKey?: string | null; name: string; retainer?: number }} T
 * @param {T[]} clients
 * @param {Record<string, string>} [groupNameByCvr] Valgfrie navne fra `ClientGroup`.
 * @returns {(T & { groupCvr?: string; groupName?: string; groupSize?: number })[]}
 */
export function annotateClientsWithGroups(clients, groupNameByCvr = {}) {
  /** @type {Map<string, T[]>} */
  const buckets = new Map();
  for (const c of clients) {
    const key = clientGroupKey(c);
    if (!key) continue;
    const list = buckets.get(key);
    if (list) list.push(c);
    else buckets.set(key, [c]);
  }

  return clients.map((c) => {
    const key = clientGroupKey(c);
    const members = key ? buckets.get(key) : undefined;
    if (!key || !members || members.length < 2) return c;
    const custom = String(groupNameByCvr[key] ?? "").trim();
    const existing = String(/** @type {{ groupName?: string }} */ (c).groupName ?? "").trim();
    return {
      ...c,
      groupCvr: key,
      groupName: custom || existing || defaultGroupName(members),
      groupSize: members.length,
    };
  });
}

/**
 * Udled koncern-id → navn fra annoterede klienter (til UI-opslag).
 * @param {{ groupCvr?: string; groupName?: string }[]} clients
 * @returns {Record<string, string>}
 */
export function groupNamesFromClients(clients) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const c of clients) {
    if (c.groupCvr && c.groupName && !out[c.groupCvr]) out[c.groupCvr] = c.groupName;
  }
  return out;
}

/** @param {Record<string, number>[]} maps @param {number[]} weights */
function weightedAllocation(maps, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  /** @type {Record<string, number>} */
  const out = {};
  maps.forEach((alloc, i) => {
    const w = total > 0 ? weights[i] / total : 1 / maps.length;
    for (const [dept, pct] of Object.entries(alloc ?? {})) {
      if (typeof pct !== "number" || !Number.isFinite(pct)) continue;
      out[dept] = (out[dept] ?? 0) + pct * w;
    }
  });
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

/** @param {number[][]} series */
function sumSeriesAlignedToEnd(series) {
  const nonEmpty = series.filter((s) => Array.isArray(s) && s.length > 0);
  if (!nonEmpty.length) return [];
  const len = Math.max(...nonEmpty.map((s) => s.length));
  const out = Array.from({ length: len }, () => 0);
  for (const s of nonEmpty) {
    const offset = len - s.length;
    s.forEach((v, i) => {
      out[offset + i] += num(v);
    });
  }
  return out.map((v) => Math.round(v * 10) / 10);
}

/** @param {(string | null | undefined)[]} values */
function earliestIso(values) {
  const list = values.filter((v) => typeof v === "string" && v.trim()).map(String);
  if (!list.length) return "";
  return list.reduce((min, v) => (v < min ? v : min));
}

/**
 * Saml flere brands til ét kunde-objekt med samme form som en enkelt klient.
 * MRR/timer/budget er summer; sundhed er den værste; allokering er vægtet efter MRR.
 * Felter der kun findes i detalje-visningen (NPS, domæner, kontakter, ...) samles hvis de findes.
 *
 * @param {Record<string, any>[]} brands
 * @param {{ cvr: string; name: string }} meta
 * @returns {Record<string, any>}
 */
export function aggregateBrandClients(brands, meta) {
  const sorted = [...brands].sort(byRetainerDesc);
  const lead = sorted[0] ?? {};

  const anyActive = brands.some((b) => b.status === "active");
  const anyPaused = brands.some((b) => b.status === "paused");
  const status = anyActive ? "active" : anyPaused ? "paused" : "inactive";

  // MRR: kun aktive brands tæller i en aktiv koncern (matcher agency-MRR); ellers historisk sum.
  const retainerPool = anyActive ? brands.filter((b) => b.status === "active") : brands;
  const sumOver = (list, key) => list.reduce((s, b) => s + num(b[key]), 0);

  const retainer = sumOver(retainerPool, "retainer");
  const retainerBase = sumOver(retainerPool, "retainerBase");
  const retainerFromContracts = sumOver(retainerPool, "retainerFromContracts");

  const health = brands.reduce(
    (worst, b) => ((HEALTH_RANK[b.health] ?? 0) > (HEALTH_RANK[worst] ?? 0) ? b.health : worst),
    /** @type {'ok' | 'warn' | 'bad'} */ ("ok"),
  );

  const marginWeights = brands.map((b) => Math.max(num(b.retainer), 0));
  const marginWeightTotal = marginWeights.reduce((s, w) => s + w, 0);
  const monthlyProfitMargin =
    marginWeightTotal > 0 ?
      brands.reduce((s, b, i) => s + num(b.monthlyProfitMargin) * marginWeights[i], 0) /
      marginWeightTotal
    : brands.reduce((s, b) => s + num(b.monthlyProfitMargin), 0) / Math.max(brands.length, 1);

  const allocation = weightedAllocation(
    brands.map((b) => b.allocation ?? {}),
    brands.map((b) => Math.max(num(b.retainer), 0)),
  );

  const estimated = sumOver(brands, "estimatedHoursOpen");

  /** @type {Record<string, string | null>} */
  const deptAssignees = {};
  for (const b of sorted) {
    for (const [dept, member] of Object.entries(b.deptAssignees ?? {})) {
      if (member && !deptAssignees[dept]) deptAssignees[dept] = member;
    }
  }

  const npsHistory = brands
    .flatMap((b) => (Array.isArray(b.npsHistory) ? b.npsHistory : []))
    .sort((a, b) => String(a.respondedAt ?? "").localeCompare(String(b.respondedAt ?? "")));

  const cvrs = [...new Set(brands.map((b) => normalizeCvr(b.cvr)).filter(Boolean))];

  const out = {
    id: `${CLIENT_GROUP_ID_PREFIX}${meta.cvr}`,
    name: meta.name,
    industry: sorted.map((b) => b.industry).find((v) => typeof v === "string" && v.trim()) ?? "",
    logo: initialsFromName(meta.name),
    hue: num(lead.hue, 220),
    currency: lead.currency ?? "DKK",
    retainer,
    retainerBase,
    retainerFromContracts,
    status,
    health,
    lastActivity: lead.lastActivity ?? "—",
    owner: lead.owner ?? "",
    allocation,
    servicesActive: [...new Set(brands.flatMap((b) => b.servicesActive ?? []))],
    tags: [...new Set(brands.flatMap((b) => b.tags ?? []))],
    hoursThisMonth: Math.round(sumOver(brands, "hoursThisMonth") * 100) / 100,
    hoursBudget: sumOver(brands, "hoursBudget"),
    ...(estimated > 0 ? { estimatedHoursOpen: Math.round(estimated * 100) / 100 } : {}),
    monthlyProfitMargin,
    utilisationHistory: sumSeriesAlignedToEnd(brands.map((b) => b.utilisationHistory ?? [])),
    // Fælles CVR kun hvis alle brands deler ét; ellers vises `cvrs`.
    cvr: cvrs.length === 1 ? cvrs[0] : undefined,
    cvrs,
    // Koncern-meta
    isGroup: true,
    groupCvr: meta.cvr,
    groupName: meta.name,
    groupSize: brands.length,
    href: clientGroupHref(meta.cvr),
    brands: sorted,
  };

  // Detalje-felter (kun hvis brandene har dem — fx fra client-detail eller demo-data)
  const startedAt = earliestIso(brands.map((b) => b.startedAt));
  if (startedAt) out.startedAt = startedAt;
  const renewalAt = earliestIso(brands.filter((b) => b.status === "active").map((b) => b.renewalAt));
  if (renewalAt) out.renewalAt = renewalAt;
  if (npsHistory.length) out.npsHistory = npsHistory;
  if (lead.npsInterval) out.npsInterval = lead.npsInterval;
  if (brands.some((b) => Array.isArray(b.domains))) {
    out.domains = brands.flatMap((b) => (Array.isArray(b.domains) ? b.domains : []));
  }
  if (Object.keys(deptAssignees).length) out.deptAssignees = deptAssignees;
  if (brands.some((b) => typeof b.clv === "number")) out.clv = sumOver(brands, "clv");
  if (lead.primaryContact) out.primaryContact = lead.primaryContact;
  if (lead.secondaryContact) out.secondaryContact = lead.secondaryContact;
  if (typeof lead.googleDriveUrl === "string" && brands.length === 1) {
    out.googleDriveUrl = lead.googleDriveUrl;
  }

  return out;
}

/**
 * Byg liste af "kunder" til UI: koncerner samles til én række, andre klienter er uændrede.
 * Forventer klienter der allerede er annoteret med `annotateClientsWithGroups`.
 *
 * @param {Record<string, any>[]} clients
 * @returns {Record<string, any>[]}
 */
export function buildCustomerEntities(clients) {
  /** @type {Map<string, Record<string, any>[]>} */
  const byGroup = new Map();
  for (const c of clients) {
    if (!c.groupCvr) continue;
    const list = byGroup.get(c.groupCvr);
    if (list) list.push(c);
    else byGroup.set(c.groupCvr, [c]);
  }

  /** @type {Record<string, any>[]} */
  const out = [];
  /** @type {Set<string>} */
  const emitted = new Set();
  for (const c of clients) {
    if (!c.groupCvr) {
      out.push(c);
      continue;
    }
    if (emitted.has(c.groupCvr)) continue;
    emitted.add(c.groupCvr);
    const members = byGroup.get(c.groupCvr) ?? [c];
    out.push(
      aggregateBrandClients(members, {
        cvr: c.groupCvr,
        name: c.groupName ?? defaultGroupName(members),
      }),
    );
  }
  return out;
}

/**
 * Href til en række i kundelisten (koncern eller enkelt kunde).
 * @param {{ id: string; href?: string }} customer
 */
export function customerHref(customer) {
  return customer.href ?? `${routes.clients}/${encodeURIComponent(customer.id)}`;
}

/**
 * Antal "kunder" hvor en koncern taeller som en (fx til workload/KPI).
 * @param {{ cvr?: string | null; groupKey?: string | null; name: string }[]} clients
 */
export function countCustomerEntities(clients) {
  /** @type {Set<string>} */
  const groups = new Set();
  const counts = new Map();
  for (const c of clients) {
    const key = clientGroupKey(c);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let standalone = 0;
  for (const c of clients) {
    const key = clientGroupKey(c);
    if (key && (counts.get(key) ?? 0) > 1) groups.add(key);
    else standalone += 1;
  }
  return standalone + groups.size;
}
