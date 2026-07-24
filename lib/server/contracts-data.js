import mongoose from "mongoose";

import { contractNeedsRenewalSoon } from "@/lib/crm/contract-utils";
import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
import { enrichClientRetainer, sumContributingContractRetainer } from "@/lib/crm/retainer-utils";
import {
  endOfReportMonth,
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @param {Date | string | undefined | null} d */
export function contractToIsoDateOnly(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CONTRACT_KIND_DA = /** @type {Record<string, string>} */ ({
  retainer: "Retainer",
  project: "Projekt",
  one_off: "Engangs",
  subscription: "Abonnement",
});

/**
 * @param {unknown} raw
 */
function mongoContractUiAccountStatus(raw) {
  const s = String(raw ?? "");
  if (s === "ended") return /** @type {const} */ ("inactive");
  if (s === "pending_signature") return /** @type {const} */ ("pending_signature");
  if (s === "active" || s === "notice") return /** @type {const} */ ("active");
  return /** @type {const} */ ("paused");
}

/**
 * @param {unknown} raw
 */
function mongoContractLifecycleActive(raw) {
  const s = String(raw ?? "");
  return s === "active" || s === "notice";
}

/**
 * @param {Record<string, unknown>} ctrDoc
 */
function mongoContractSigningState(ctrDoc) {
  if (ctrDoc.signedAt) return /** @type {const} */ ("signed");
  if (String(ctrDoc.status ?? "") === "pending_signature") {
    return /** @type {const} */ ("pending");
  }
  return /** @type {const} */ ("unsigned");
}

/**
 * @param {Record<string, unknown>} doc
 * @param {number} year
 * @param {number} month 1–12
 */
export function mongoContractOverlapsMonth(doc, year, month) {
  const ms = startOfReportMonth(year, month);
  const me = endOfReportMonth(year, month);

  const st = doc.startDate ? new Date(String(doc.startDate)) : null;
  if (st && !Number.isNaN(st.getTime()) && st >= me) return false;

  let endCand = doc.endDate ? new Date(String(doc.endDate)) : null;
  if (!endCand || Number.isNaN(endCand.getTime())) {
    endCand = doc.renewalDate ? new Date(String(doc.renewalDate)) : null;
  }
  if (endCand && !Number.isNaN(endCand.getTime()) && endCand < ms) return false;

  return true;
}

/**
 * @param {Record<string, unknown>} doc
 */
export function mapTeamMemberFromMongo(doc) {
  const disciplineKeys = Array.isArray(doc.disciplineKeys)
    ? doc.disciplineKeys.map(String).filter(Boolean)
    : [];
  const dept = String(doc.departmentKey ?? disciplineKeys[0] ?? "");
  const userId = doc.userId != null ? String(doc.userId) : "";
  const imageRaw = typeof doc.image === "string" ? doc.image.trim() : "";
  return {
    id: String(doc.key),
    name: String(doc.name),
    role: String(doc.roleTitle ?? ""),
    dept,
    disciplineKeys: disciplineKeys.length ? disciplineKeys : dept ? [dept] : [],
    avatar: String(doc.avatarInitials ?? doc.name?.toString().slice(0, 2).toUpperCase() ?? "?"),
    hue: typeof doc.hue === "number" ? doc.hue : 220,
    weeklyHours: typeof doc.weeklyHours === "number" ? doc.weeklyHours : 37,
    userAccountId: userId ? `u-${userId}` : null,
    image: imageRaw || undefined,
  };
}

/**
 * @param {Record<string, unknown>} ctrDoc
 * @param {Record<string, unknown>} clientDoc
 */
export function buildContractWireRow(ctrDoc, clientDoc) {
  const slug = String(clientDoc.slug ?? clientDoc._id);
  const keyTrim = ctrDoc.key != null ? String(ctrDoc.key).trim() : "";
  const oid = typeof ctrDoc._id === "object" && ctrDoc._id !== null ? String(ctrDoc._id) : "";
  const id = keyTrim || `ctr-${slug}-${oid.slice(-6)}`;

  const pc = mapClientForPulse(clientDoc, {});

  const staticRetainer =
    typeof clientDoc.retainerAmount === "number" ? clientDoc.retainerAmount : 0;

  const startedAt =
    contractToIsoDateOnly(ctrDoc.startDate) || contractToIsoDateOnly(clientDoc.startedAt) || "";
  const renewalAt =
    contractToIsoDateOnly(ctrDoc.renewalDate) || contractToIsoDateOnly(clientDoc.renewalAt) || "";

  const kind = ctrDoc.label
    ? String(ctrDoc.label)
    : CONTRACT_KIND_DA[String(ctrDoc.type)] ?? String(ctrDoc.type ?? "aftale");

  const monthlyValue =
    typeof ctrDoc.value === "number" && Number.isFinite(ctrDoc.value) ? ctrDoc.value : staticRetainer;

  const signedAtIso =
    ctrDoc.signedAt instanceof Date ?
      ctrDoc.signedAt.toISOString()
    : typeof ctrDoc.signedAt === "string" ?
      ctrDoc.signedAt
    : undefined;

  return {
    id,
    mongoId: oid || undefined,
    clientId: slug,
    clientMongoId: clientDoc._id != null ? String(clientDoc._id) : undefined,
    clientName: pc.name,
    clientLogo: pc.logo,
    clientHue: pc.hue,
    kind,
    monthlyValue,
    currency: String(ctrDoc.currency ?? pc.currency ?? "DKK"),
    startedAt,
    renewalAt,
    accountStatus: mongoContractUiAccountStatus(ctrDoc.status),
    dbStatus: String(ctrDoc.status ?? ""),
    signingState: mongoContractSigningState(ctrDoc),
    health: /** @type {'ok' | 'warn' | 'bad'} */ (pc.health),
    ownerId: String(clientDoc.ownerMemberKey ?? ""),
    noticeDays:
      typeof ctrDoc.noticeDays === "number" && Number.isFinite(ctrDoc.noticeDays) ?
        ctrDoc.noticeDays
      : 90,
    documentUrl: typeof ctrDoc.documentUrl === "string" ? ctrDoc.documentUrl : undefined,
    signedBy:
      typeof ctrDoc.signedByName === "string" && ctrDoc.signedByName ?
        ctrDoc.signedByName
      : typeof ctrDoc.signedBy === "string" ?
        ctrDoc.signedBy
      : undefined,
    signedAt: signedAtIso,
    signedByEmail:
      typeof ctrDoc.signedByEmail === "string" ? ctrDoc.signedByEmail : undefined,
    signedByTitle:
      typeof ctrDoc.signedByTitle === "string" && ctrDoc.signedByTitle ?
        ctrDoc.signedByTitle
      : undefined,
    signedByCompany:
      typeof ctrDoc.signedByCompany === "string" && ctrDoc.signedByCompany ?
        ctrDoc.signedByCompany
      : undefined,
    signatureIp:
      typeof ctrDoc.signatureIp === "string" && ctrDoc.signatureIp ?
        ctrDoc.signatureIp
      : undefined,
    signatureUserAgent:
      typeof ctrDoc.signatureUserAgent === "string" && ctrDoc.signatureUserAgent ?
        ctrDoc.signatureUserAgent
      : undefined,
    signatureDocumentHash:
      typeof ctrDoc.signatureDocumentHash === "string" && ctrDoc.signatureDocumentHash ?
        ctrDoc.signatureDocumentHash
      : undefined,
    consentAcceptedAt:
      ctrDoc.consentAcceptedAt instanceof Date ?
        ctrDoc.consentAcceptedAt.toISOString()
      : typeof ctrDoc.consentAcceptedAt === "string" ?
        ctrDoc.consentAcceptedAt
      : undefined,
    documentBodyMd:
      typeof ctrDoc.documentBodyMd === "string" && ctrDoc.documentBodyMd ?
        ctrDoc.documentBodyMd
      : undefined,
    version: typeof ctrDoc.version === "number" ? ctrDoc.version : 1,
  };
}

/** @typedef {ReturnType<typeof buildContractWireRow>} ContractWireRow */

/**
 * @param {import('@/lib/crm/pulse-types').PulseClient[]} clients
 */
function buildAlertsForPortfolio(clients) {
  /** @type {import('@/lib/crm/pulse-types').PulseSmartAlert[]} */
  const alerts = [];
  let n = 0;
  for (const c of clients) {
    if (c.status !== "active") continue;
    if (c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget * 1.05) {
      const pct = Math.round((c.hoursThisMonth / c.hoursBudget - 1) * 100);
      alerts.push({
        id: `ctr-db-over-${n++}`,
        severity: pct > 20 ? "bad" : "warn",
        client: c.id,
        type: "overBudget",
        title: `${c.name} — ${pct}% over budget`,
        body: `${c.hoursThisMonth.toFixed(1)} / ${c.hoursBudget} t i perioden.`,
        age: "nu",
      });
    }
    if (c.health === "bad") {
      alerts.push({
        id: `ctr-db-health-bad-${n++}`,
        severity: "bad",
        client: c.id,
        type: "health",
        title: `${c.name} — kritisk sundhed`,
        body: "Kunden er markeret med kritisk sundhed i CRM.",
        age: "—",
      });
    } else if (c.health === "warn") {
      alerts.push({
        id: `ctr-db-health-warn-${n++}`,
        severity: "warn",
        client: c.id,
        type: "health",
        title: `${c.name} — advarsel`,
        body: "Kunden kræver opmærksomhed (sundhed: advarsel).",
        age: "—",
      });
    }
  }
  return alerts.slice(0, 12);
}

/**
 * @param {string} raw
 */
function normalizeTaskUiStatus(raw) {
  const s = String(raw ?? "todo");
  if (s === "cancelled") return "done";
  if (["todo", "doing", "review", "done", "blocked"].includes(s)) {
    return /** @type {'todo' | 'doing' | 'review' | 'done' | 'blocked'} */ (s);
  }
  return "todo";
}

/**
 * @param {{ includeTest?: boolean; year?: number; month?: number }} opts
 */
export async function fetchContractsPortfolio(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  const { year, month } = normalizeReportPeriod(opts);
  const renewalReferenceIso = lastCalendarDayIsoOfReportMonth(year, month);

  await connectDb();

  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  const [contractsRaw, teamRaw] = await Promise.all([
    Contract.find(/** @type {Record<string, unknown>} */ (scope)).sort({ updatedAt: -1 }).lean(),
    TeamMember.find(
      /** @type {Record<string, unknown>} */ ({
        ...scope,
        active: { $ne: false },
      }),
    )
      .sort({ name: 1 })
      .lean(),
  ]);

  /** @type {Record<string, unknown>[]} */
  const contractsDocs = Array.isArray(contractsRaw) ? contractsRaw : [];

  const allClientsForPicker = await Client.find(/** @type {Record<string, unknown>} */ (scope))
    .select("name slug status")
    .sort({ name: 1 })
    .lean();

  const clientsPicker = (Array.isArray(allClientsForPicker) ? allClientsForPicker : []).map((c) => ({
    id: String(c.slug ?? c._id),
    mongoId: String(c._id),
    name: String(c.name ?? ""),
    status: String(c.status ?? "active"),
  }));

  if (contractsDocs.length === 0) {
    return {
      source: /** @type {const} */ ("database"),
      period: {
        year,
        month,
        label: formatReportPeriodLabel(year, month),
        isCurrent: isCurrentReportPeriod(year, month),
      },
      renewalReferenceIso,
      contracts: /** @type {ContractWireRow[]} */ ([]),
      clients: clientsPicker,
      team: teamRaw.map(mapTeamMemberFromMongo),
      summary: {
        total: 0,
        activeCount: 0,
        mrrActiveDkk: 0,
        mrrOverlapActiveDkk: 0,
        renewalSoonCount: 0,
        pausedCount: 0,
        pendingSignatureCount: 0,
      },
    };
  }

  const clientIds = [...new Set(contractsDocs.map((c) => String(c.clientId)))];

  const clientsRaw = await Client.find(
    andQuery(
      { _id: { $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      /** @type {Record<string, unknown>} */ (scope),
    ),
  ).lean();

  /** @type {Record<string, Record<string, unknown>>} */
  const clientById = Object.fromEntries(
    (Array.isArray(clientsRaw) ? clientsRaw : []).map((d) => [String(d._id), d]),
  );

  /** @type {ContractWireRow[]} */
  const rows = [];
  let activeCount = 0;
  let mrrActiveDkk = 0;
  let mrrOverlapActiveDkk = 0;
  let renewalSoonCount = 0;
  let pausedCount = 0;
  let pendingSignatureCount = 0;

  for (const ctr of contractsDocs) {
    const cid = String(ctr.clientId);
    const clientDoc = clientById[cid];
    if (!clientDoc) continue;

    const row = buildContractWireRow(ctr, clientDoc);
    rows.push(row);

    if (row.accountStatus === "active") {
      activeCount += 1;
      if (row.currency === "DKK") mrrActiveDkk += row.monthlyValue;
    }
    if (row.accountStatus === "paused") pausedCount += 1;
    if (row.accountStatus === "pending_signature" || row.signingState === "pending") {
      pendingSignatureCount += 1;
    }

    if (
      mongoContractLifecycleActive(ctr.status) &&
      mongoContractOverlapsMonth(ctr, year, month) &&
      row.currency === "DKK"
    ) {
      mrrOverlapActiveDkk += row.monthlyValue;
    }

    if (contractNeedsRenewalSoon(row, 90, renewalReferenceIso)) {
      renewalSoonCount += 1;
    }
  }

  rows.sort((a, b) => a.clientName.localeCompare(b.clientName, "da"));

  return {
    source: /** @type {const} */ ("database"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    renewalReferenceIso,
    contracts: rows,
    clients: clientsPicker,
    team: teamRaw.map(mapTeamMemberFromMongo),
    summary: {
      total: rows.length,
      activeCount,
      mrrActiveDkk,
      mrrOverlapActiveDkk,
      renewalSoonCount,
      pausedCount,
      pendingSignatureCount,
    },
  };
}

/**
 * @param {{
 *   contractKey: string;
 *   includeTest?: boolean;
 *   year?: number;
 *   month?: number;
 * }} opts
 */
export async function fetchContractDetailBundle(opts) {
  const includeTest = Boolean(opts.includeTest);
  const contractKey = String(opts.contractKey || "").trim();
  if (!contractKey) return { error: "Mangler kontrakt-id", status: 400 };

  const { year, month } = normalizeReportPeriod(opts);
  const renewalReferenceIso = lastCalendarDayIsoOfReportMonth(year, month);

  await connectDb();

  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  /** @type {Record<string, unknown>[]} */
  const keyOrId = [{ key: contractKey }];
  if (mongoose.Types.ObjectId.isValid(contractKey)) {
    keyOrId.push({ _id: new mongoose.Types.ObjectId(contractKey) });
  }

  const ctrDoc = await Contract.findOne(
    andQuery(
      /** @type {Record<string, unknown>} */ ({ $or: keyOrId }),
      /** @type {Record<string, unknown>} */ (scope),
    ),
  ).lean();

  if (!ctrDoc) return { error: "Ikke fundet", status: 404 };

  const clientDoc = await Client.findOne(
    andQuery(
      { _id: ctrDoc.clientId },
      /** @type {Record<string, unknown>} */ (scope),
    ),
  ).lean();

  if (!clientDoc) return { error: "Tilknyttet kunde ikke fundet", status: 404 };

  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);

  const entries = await TimeEntry.find({
    clientId: clientDoc._id,
    workedAt: { $gte: monthStart, $lt: monthEnd },
    billable: { $ne: false },
  })
    .select("durationMinutes")
    .lean();

  const clientContractDocs = await Contract.find(
    andQuery(
      { clientId: clientDoc._id },
      /** @type {Record<string, unknown>} */ (scope),
    ),
  )
    .select("clientId value status type signedAt")
    .lean();

  let hoursThisPeriod = 0;
  for (const e of entries) {
    hoursThisPeriod += (Number(e.durationMinutes) || 0) / 60;
  }

  const hoursRounded = Math.round(hoursThisPeriod * 10) / 10;
  const hoursMap = { [String(clientDoc._id)]: hoursRounded };

  const pulseClient = mapClientForPulse(clientDoc, hoursMap);
  const slug = String(clientDoc.slug ?? clientDoc._id);
  const contractRetainerSum = sumContributingContractRetainer(
    /** @type {Record<string, unknown>[]} */ (clientContractDocs),
  );

  const ownerQuery = pulseClient.owner
    ? andQuery({ key: pulseClient.owner }, /** @type {Record<string, unknown>} */ (scope))
    : null;

  const clientScopeQuery = andQuery(
    { clientId: clientDoc._id },
    /** @type {Record<string, unknown>} */ (scope),
  );

  const [ownerDoc, tasksRaw] = await Promise.all([
    ownerQuery ? TeamMember.findOne(ownerQuery).lean() : Promise.resolve(null),
    Task.find(clientScopeQuery).sort({ dueDate: 1 }).limit(40).lean(),
  ]);

  const ownerPulse = ownerDoc ? mapTeamMemberFromMongo(ownerDoc) : null;

  /** @match static CLIENTS nested shape for linked card + tasks */
  const detailClient = enrichClientRetainer(
    {
      ...pulseClient,
      id: slug,
      startedAt: contractToIsoDateOnly(clientDoc.startedAt) || "",
      renewalAt: contractToIsoDateOnly(clientDoc.renewalAt) || "",
    },
    contractRetainerSum,
  );

  const contractRow = buildContractWireRow(ctrDoc, clientDoc);

  const tasks = tasksRaw.map((t) => ({
    id: String(t._id),
    title: String(t.title ?? "—"),
    status: normalizeTaskUiStatus(String(t.status)),
    priority: /** @type {'low'|'medium'|'high'} */ (String(t.priority ?? "medium")),
    dueDate: contractToIsoDateOnly(t.dueDate) || new Date().toISOString().slice(0, 10),
  }));

  const alerts = buildAlertsForPortfolio([pulseClient]);

  /** @type {{ month: string; retainer: number; currency: string }[]} */
  const retainerHistory = [];
  if (detailClient.retainer > 0) {
    retainerHistory.push({
      month: formatReportPeriodLabel(year, month),
      retainer: detailClient.retainer,
      currency: detailClient.currency,
    });
  }

  return {
    source: /** @type {'database'} */ ("database"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    renewalReferenceIso,
    contract: contractRow,
    client: detailClient,
    owner: ownerPulse,
    tasks,
    alerts,
    retainerHistory,
    revisions: /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */ ([]),
    referenceChipLabel: "Periodens slutdato",
    referenceChipValue: renewalReferenceIso,
  };
}
