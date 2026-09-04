import mongoose from "mongoose";

import { computeClv } from "@/lib/crm/client-utils";
import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
import {
  enrichClientRetainer,
  sumContributingContractRetainer,
} from "@/lib/crm/retainer-utils";
import {
  endOfReportMonth,
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import Client from "@/lib/db/models/client";
import ClientDomain from "@/lib/db/models/client-domain";
import Contract from "@/lib/db/models/contract";
import Note from "@/lib/db/models/note";
import NpsResponse from "@/lib/db/models/nps-response";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { enrichMembersWithUserImages, userImageByUserId } from "@/lib/server/member-user-images";

/** @param {unknown} contact */
function embedContact(contact) {
  const c =
    /** @type {{
     *   name?: string;
     *   title?: string;
     *   email?: string;
     *   phone?: string;
     *   isPrimary?: boolean;
     *   linkedinUrl?: string;
     *   lastContactedAt?: Date | string;
     * } | undefined} */ (contact);
  if (!c || !String(c.name ?? "").trim()) return null;
  const last =
    c.lastContactedAt instanceof Date ? c.lastContactedAt
    : c.lastContactedAt ? new Date(String(c.lastContactedAt))
    : null;
  return {
    name: String(c.name ?? "—"),
    title: String(c.title ?? ""),
    email: String(c.email ?? ""),
    phone: String(c.phone ?? ""),
    isPrimary: Boolean(c.isPrimary),
    linkedinUrl: typeof c.linkedinUrl === "string" ? c.linkedinUrl : undefined,
    lastContactedAt: last && !Number.isNaN(last.getTime()) ? toIsoDateOnly(last) : undefined,
  };
}

/** @param {unknown} mapLike */
function mapFromMaybeMap(mapLike) {
  if (!mapLike || typeof mapLike !== "object") return undefined;
  if (mapLike instanceof Map) return Object.fromEntries(mapLike);
  return /** @type {Record<string, unknown>} */ (mapLike);
}

/** @param {Date | string | undefined | null} d */
function toIsoDateOnly(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {Record<string, unknown>[]} docs
 */
function mapTeamMembers(docs) {
  return docs.map((doc) => {
    const imageRaw = typeof doc.image === "string" ? doc.image.trim() : "";
    return {
      id: String(doc.key),
      name: String(doc.name),
      role: String(doc.roleTitle ?? ""),
      dept: String(doc.departmentKey ?? ""),
      avatar: String(doc.avatarInitials ?? doc.name?.toString().slice(0, 2).toUpperCase() ?? "?"),
      hue: typeof doc.hue === "number" ? doc.hue : 220,
      weeklyHours: typeof doc.weeklyHours === "number" ? doc.weeklyHours : 37,
      image: imageRaw || undefined,
    };
  });
}

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

function accountStatusFromContractStatus(status) {
  if (status === "active") return "active";
  if (status === "notice") return "active";
  return "paused";
}

const CONTRACT_KIND_DA = /** @type {Record<string, string>} */ ({
  retainer: "Retainer",
  project: "Projekt",
  one_off: "Engangs",
  subscription: "Abonnement",
});

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
        id: `db-over-${n++}`,
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
        id: `db-health-bad-${n++}`,
        severity: "bad",
        client: c.id,
        type: "health",
        title: `${c.name} — kritisk sundhed`,
        body: "Kunden er markeret med kritisk sundhed i CRM.",
        age: "—",
      });
    } else if (c.health === "warn") {
      alerts.push({
        id: `db-health-warn-${n++}`,
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
 * Scale small integer NPS scores (e.g. 0–10) to match mock UI / KPI copy (0–100).
 * @param {number} score
 */
export function normalizeNpsDisplayScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  return s <= 10 ? Math.round(s * 10) : Math.round(s);
}

/**
 * @param {{ clientKey: string; includeTest?: boolean; year?: number; month?: number }} opts
 */
export async function fetchClientDetailBundle(opts) {
  const includeTest = Boolean(opts.includeTest);
  const clientKey = String(opts.clientKey || "").trim();
  if (!clientKey) return { error: "Mangler kundenøgle", status: 400 };

  const { year, month } = normalizeReportPeriod(opts);

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  /** @type {Record<string, unknown>[]} */
  const slugOrId = [{ slug: clientKey }];
  if (mongoose.Types.ObjectId.isValid(clientKey)) {
    slugOrId.push({ _id: new mongoose.Types.ObjectId(clientKey) });
  }

  const clientDoc = await Client.findOne(
    andQuery(
      /** @type {Record<string, unknown>} */ ({ $or: slugOrId }),
      /** @type {Record<string, unknown>} */ (scope),
    ),
  ).lean();

  if (!clientDoc) return { error: "Ikke fundet", status: 404 };

  const mongoId = String(clientDoc._id);
  const slug = String(clientDoc.slug ?? mongoId);

  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);

  /** @type {Record<string, number>} */
  const hoursMap = {};

  const entries = await TimeEntry.find({
    clientId: clientDoc._id,
    workedAt: { $gte: monthStart, $lt: monthEnd },
    billable: { $ne: false },
  })
    .select("durationMinutes")
    .lean();

  let hoursThisPeriod = 0;
  for (const e of entries) {
    hoursThisPeriod += (Number(e.durationMinutes) || 0) / 60;
  }

  hoursMap[mongoId] = Math.round(hoursThisPeriod * 10) / 10;

  const pulseClient = mapClientForPulse(clientDoc, hoursMap);

  const teamQuery = andQuery(
    { active: { $ne: false } },
    /** @type {Record<string, unknown>} */ (scope),
  );

  const ownerQuery = pulseClient.owner
    ? andQuery({ key: pulseClient.owner }, /** @type {Record<string, unknown>} */ (scope))
    : null;

  const clientScopeQuery = andQuery(
    { clientId: clientDoc._id },
    /** @type {Record<string, unknown>} */ (scope),
  );

  const [teamRaw, ownerDoc, contractDocs, tasksRaw, notesRaw, npsRaw, domainRaw] = await Promise.all([
    TeamMember.find(teamQuery).sort({ name: 1 }).lean(),
    ownerQuery ? TeamMember.findOne(ownerQuery).lean() : Promise.resolve(null),
    Contract.find(clientScopeQuery).sort({ updatedAt: -1 }).limit(24).lean(),
    Task.find(clientScopeQuery).sort({ dueDate: 1 }).limit(40).lean(),
    Note.find({ clientId: clientDoc._id }).sort({ occurredAt: -1 }).limit(25).lean(),
    NpsResponse.find({ clientId: clientDoc._id }).sort({ respondedAt: -1 }).limit(24).lean(),
    ClientDomain.find({ clientId: clientDoc._id }).sort({ isPrimary: -1, domain: 1 }).lean(),
  ]);

  const teamEnriched = Array.isArray(teamRaw) ? await enrichMembersWithUserImages(teamRaw) : [];
  const team = mapTeamMembers(teamEnriched);

  let ownerPulse = null;
  if (ownerDoc) {
    const ownerImage =
      ownerDoc.userId != null ? await userImageByUserId(String(ownerDoc.userId)) : null;
    ownerPulse = mapTeamMembers([ownerImage ? { ...ownerDoc, image: ownerImage } : ownerDoc])[0];
  }

  const deptAssigneesMap = mapFromMaybeMap(clientDoc.deptAssignees);

  const staticRetainer =
    typeof clientDoc.retainerAmount === "number" ? clientDoc.retainerAmount : 0;
  const contractRetainerSum = sumContributingContractRetainer(
    /** @type {Record<string, unknown>[]} */ (Array.isArray(contractDocs) ? contractDocs : []),
  );
  const effectiveRetainer = staticRetainer + contractRetainerSum;

  /** @match static CLIENTS nested shape */
  const detailClient = enrichClientRetainer(
    {
      ...pulseClient,
      id: slug,
    startedAt: toIsoDateOnly(clientDoc.startedAt) || "",
    renewalAt: toIsoDateOnly(clientDoc.renewalAt) || "",
    cvr: typeof clientDoc.cvr === "string" ? clientDoc.cvr : undefined,
    terminatedAt: toIsoDateOnly(clientDoc.terminatedAt) || undefined,
    churnReason: Array.isArray(clientDoc.churnReason) ? clientDoc.churnReason.map(String) : [],
    churnNote: typeof clientDoc.churnNote === "string" ? clientDoc.churnNote : undefined,
    leadSource: typeof clientDoc.leadSource === "string" ? clientDoc.leadSource : undefined,
    googleDriveUrl: typeof clientDoc.googleDriveUrl === "string" ? clientDoc.googleDriveUrl : undefined,
    annualAdjustmentPct:
      typeof clientDoc.annualAdjustmentPct === "number" ? clientDoc.annualAdjustmentPct : undefined,
    lastContactedAt: toIsoDateOnly(clientDoc.lastContactedAt) || undefined,
    customerClickUpId:
      typeof clientDoc.customerClickUpId === "string" ? clientDoc.customerClickUpId : undefined,
    clickUpTaskName:
      typeof clientDoc.clickUpTaskName === "string" ? clientDoc.clickUpTaskName : undefined,
    marketingStartMrr:
      typeof clientDoc.marketingStartMrr === "number" ? clientDoc.marketingStartMrr : undefined,
    marketingUpsellMrr:
      typeof clientDoc.marketingUpsellMrr === "number" ? clientDoc.marketingUpsellMrr : undefined,
    agreementType: typeof clientDoc.agreementType === "string" ? clientDoc.agreementType : undefined,
    infoMd: typeof clientDoc.infoMd === "string" ? clientDoc.infoMd : "",
    deptAssignees: deptAssigneesMap ?? undefined,
    clv: computeClv({
      startedAt: toIsoDateOnly(clientDoc.startedAt) || "",
      terminatedAt: toIsoDateOnly(clientDoc.terminatedAt) || null,
      retainer: effectiveRetainer,
    }),
    domains: Array.isArray(domainRaw)
      ? domainRaw.map((d) => ({
          id: typeof d.staticId === "string" ? d.staticId : String(d._id),
          clientId: slug,
          domain: String(d.domain ?? ""),
          locale: String(d.locale ?? ""),
          isPrimary: Boolean(d.isPrimary),
          cms: typeof d.cms === "string" ? d.cms : null,
        }))
      : [],
    primaryContact:
      embedContact(clientDoc.primaryContact) ?? {
        name: "Ingen primær kontakt registreret",
        title: "",
        email: "",
        phone: "",
      },
    secondaryContact: embedContact(clientDoc.secondaryContact) ?? undefined,
    /** @type {{ score: number; sentAt: string; respondedAt: string }[]} */
    npsHistory:
      Array.isArray(npsRaw)
        ? npsRaw.map((r) => {
            const responded = r.respondedAt ? new Date(String(r.respondedAt)) : null;
            const sent = r.sentAt ? new Date(String(r.sentAt)) : responded;
            return {
              score: normalizeNpsDisplayScore(Number(r.score)),
              sentAt: toIsoDateOnly(sent) || "",
              respondedAt: toIsoDateOnly(responded) || "",
              comment: typeof r.comment === "string" ? r.comment : "",
            };
          }).reverse()
        : [],
    npsInterval: String(clientDoc.npsInterval ?? "quarterly"),
    },
    contractRetainerSum,
  );

  /** @type {Record<string, unknown> | undefined} */
  let primaryCtr;
  const cd = Array.isArray(contractDocs) ? contractDocs : [];
  primaryCtr = cd.find((c) => c.status === "active") ?? cd[0];

  const commercial =
    primaryCtr && typeof primaryCtr === "object"
      ? {
          id: primaryCtr.key ? String(primaryCtr.key) : String(primaryCtr._id),
          kind: primaryCtr.label
            ? String(primaryCtr.label)
            : CONTRACT_KIND_DA[String(primaryCtr.type)] ?? String(primaryCtr.type ?? "aftale"),
          monthlyValue: typeof primaryCtr.value === "number" ? primaryCtr.value : staticRetainer,
          currency: String(primaryCtr.currency ?? detailClient.currency),
          renewalAt: toIsoDateOnly(primaryCtr.renewalDate) || detailClient.renewalAt || "",
          accountStatus: accountStatusFromContractStatus(String(primaryCtr.status ?? "")),
          noticeDays:
            typeof primaryCtr.noticeDays === "number" && Number.isFinite(primaryCtr.noticeDays) ?
              primaryCtr.noticeDays
            : 90,
          documentUrl:
            typeof primaryCtr.documentUrl === "string" ? primaryCtr.documentUrl : undefined,
          signedBy: typeof primaryCtr.signedBy === "string" ? primaryCtr.signedBy : undefined,
        }
      : null;

  const notes = notesRaw.map((n) => ({
    id: String(n._id),
    who: String(n.authorMemberKey ?? "note"),
    at: formatNoteAt(n.occurredAt),
    type: String(n.type ?? "note"),
    body: String(n.body ?? ""),
  }));

  const tasks = tasksRaw.map((t) => ({
    id: String(t._id),
    title: String(t.title ?? "—"),
    status: normalizeTaskUiStatus(String(t.status)),
    priority: /** @type {'low'|'medium'|'high'} */ (String(t.priority ?? "medium")),
    dueDate: toIsoDateOnly(t.dueDate) || new Date().toISOString().slice(0, 10),
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
    client: detailClient,
    owner: ownerPulse,
    team,
    contract: commercial,
    notes,
    tasks,
    alerts,
    retainerHistory,
    kpiTimerLabel: isCurrentReportPeriod(year, month) ? "Timer denne md" : "Timer i perioden",
  };
}

/** @param {unknown} occurred */
function formatNoteAt(occurred) {
  if (!occurred) return "—";
  const d = occurred instanceof Date ? occurred : new Date(String(occurred));
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
