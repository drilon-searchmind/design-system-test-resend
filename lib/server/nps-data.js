import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import {
  npsActiveClientsMeasured,
  npsAgencyAverageLatest,
  npsAgencyAveragePrevious,
  npsAgencyTrendMonthly,
  npsAtRiskLatestCount,
  npsDashboardClients,
  npsImprovingClientsCount,
  npsLatestDistributionBuckets,
} from "@/lib/crm/nps-utils";
import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import NpsCampaign from "@/lib/db/models/nps-campaign";
import NpsResponse from "@/lib/db/models/nps-response";
import NpsSendLog from "@/lib/db/models/nps-send-log";
import NpsTemplate from "@/lib/db/models/nps-template";
import { connectDb } from "@/lib/db/mongoose";
import { normalizeNpsDisplayScore } from "@/lib/server/client-detail-data";
import { fetchNpsSendLogSummary } from "@/lib/server/nps-send-data";
import { buildScheduleWavesFromSettings, fetchNpsSettings } from "@/lib/server/nps-settings-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
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
 * @param {number[]} xs
 */
function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * @param {{ includeTest?: boolean; year?: number; month?: number; session?: unknown }} opts
 */
export async function fetchNpsPortfolio(opts = {}) {
  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));

  const period = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const monthStart = startOfReportMonth(period.year, period.month);
  const monthLastIso = lastCalendarDayIsoOfReportMonth(period.year, period.month);
  const monthEnd = new Date(`${monthLastIso}T23:59:59.999Z`);

  const clientDocsRaw = await Client.find(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, { status: { $in: ["active", "paused"] } })
    ),
  )
    .sort({ name: 1 })
    .lean();

  /** @type {Record<string, unknown>[]} */
  const clientDocs = Array.isArray(clientDocsRaw) ? /** @type {Record<string, unknown>[]} */ (clientDocsRaw) : [];

  const clientOids = clientDocs.map((d) => d._id).filter((x) => x != null);

  const contactDocsRaw =
    clientOids.length > 0 ?
      await Contact.find({ clientId: { $in: clientOids } })
        .sort({ isPrimary: -1, name: 1 })
        .lean()
    : [];

  /** @type {Map<string, Record<string, unknown>[]>} */
  const contactsByClientOid = new Map();
  const contactList = Array.isArray(contactDocsRaw) ? contactDocsRaw : [];
  for (let cti = 0; cti < contactList.length; cti += 1) {
    const row = /** @type {Record<string, unknown>} */ (contactList[cti]);
    const cid = row.clientId != null ? String(row.clientId) : "";
    if (!cid) continue;
    if (!contactsByClientOid.has(cid)) contactsByClientOid.set(cid, []);
    contactsByClientOid.get(cid)?.push(row);
  }

  const allResponses =
    clientOids.length > 0 ?
      await NpsResponse.find({ clientId: { $in: clientOids } })
        .sort({ respondedAt: -1 })
        .limit(2000)
        .lean()
    : [];

  /** @type {Map<string, Record<string, unknown>[]>} */
  const byClient = new Map();
  for (let ri = 0; ri < allResponses.length; ri += 1) {
    const r = /** @type {Record<string, unknown>} */ (allResponses[ri]);
    const cid = r.clientId != null ? String(r.clientId) : "";
    if (!cid) continue;
    if (!byClient.has(cid)) byClient.set(cid, []);
    byClient.get(cid)?.push(r);
  }

  const tmplDocs = await NpsTemplate.find(/** @type {Record<string, unknown>} */ (andQuery(scope, { active: true })))
    .sort({ name: 1 })
    .lean()
    .then((docs) => (Array.isArray(docs) ? docs : []));

  /** @type {Record<string, string>} */
  const tmplKeyByOid = {};
  for (let ti = 0; ti < tmplDocs.length; ti += 1) {
    const t = /** @type {Record<string, unknown>} */ (tmplDocs[ti]);
    const oid = t._id != null ? String(t._id) : "";
    const k = typeof t.key === "string" ? t.key : oid;
    if (oid) tmplKeyByOid[oid] = k;
  }

  /** @type {import('@/lib/crm/static-data').CLIENTS} */
  const clientList = /** @type {unknown} */ (clientDocs.map((doc) => {
    const oid = doc._id != null ? String(doc._id) : "";
    const slug = typeof doc.slug === "string" ? doc.slug.trim() : oid;
    const raw = byClient.get(oid) ?? [];
    /** Sort ascending by response time for history */
    const sorted = [...raw].sort((a, b) => {
      const ta = a.respondedAt ? new Date(String(a.respondedAt)).getTime() : 0;
      const tb = b.respondedAt ? new Date(String(b.respondedAt)).getTime() : 0;
      return ta - tb;
    });
    /** @type {{ score: number; sentAt: string; respondedAt: string; comment?: string; rawScore?: number }[]} */
    const npsHistory = sorted.map((r) => {
      const responded = r.respondedAt ? new Date(String(r.respondedAt)) : null;
      const sent = r.sentAt ? new Date(String(r.sentAt)) : responded;
      const rawScore = Number(r.score);
      const comment = typeof r.comment === "string" && r.comment.trim() ? r.comment.trim() : undefined;
      return {
        score: normalizeNpsDisplayScore(rawScore),
        rawScore: Number.isFinite(rawScore) ? rawScore : undefined,
        sentAt: toIsoDateOnly(sent) || "",
        respondedAt: toIsoDateOnly(responded) || "",
        ...(comment ? { comment } : {}),
      };
    });

    const npsTid = doc.npsTemplateId != null ? String(doc.npsTemplateId) : "";
    const npsTemplateId = npsTid ? (tmplKeyByOid[npsTid] ?? npsTid) : null;

    const primaryRaw = doc.primaryContact;
    const secondaryRaw = doc.secondaryContact;
    const customRaw = doc.npsRecipientCustom;

    /** @type {Record<string, unknown>[]} */
    const contactRows = contactsByClientOid.get(oid) ?? [];
    const npsContacts = contactRows.map((cr) => ({
      id: cr._id != null ? String(cr._id) : "",
      name: String(cr.name ?? ""),
      email: typeof cr.email === "string" ? cr.email : "",
      title: typeof cr.title === "string" ? cr.title : "",
      isPrimary: Boolean(cr.isPrimary),
    }));

    return {
      id: slug,
      name: String(doc.name ?? "—"),
      industry: doc.industry ? String(doc.industry) : "",
      health: /** @type {'ok' | 'warn' | 'bad'} */ (String(doc.health ?? "ok")),
      status: String(doc.status ?? "active"),
      npsInterval: String(doc.npsInterval ?? "quarterly"),
      npsTemplateId,
      npsSendEnabled: doc.npsSendEnabled !== false,
      npsRecipientKind:
        typeof doc.npsRecipientKind === "string" ? doc.npsRecipientKind : "primary",
      npsRecipientContactId:
        doc.npsRecipientContactId != null ? String(doc.npsRecipientContactId) : null,
      npsRecipientCustom:
        customRaw && typeof customRaw === "object" ?
          {
            name: typeof customRaw.name === "string" ? customRaw.name : "",
            email: typeof customRaw.email === "string" ? customRaw.email : "",
          }
        : null,
      primaryContact:
        primaryRaw && typeof primaryRaw === "object" ?
          {
            name: typeof primaryRaw.name === "string" ? primaryRaw.name : "",
            title: typeof primaryRaw.title === "string" ? primaryRaw.title : "",
            email: typeof primaryRaw.email === "string" ? primaryRaw.email : "",
            phone: typeof primaryRaw.phone === "string" ? primaryRaw.phone : "",
          }
        : undefined,
      secondaryContact:
        secondaryRaw && typeof secondaryRaw === "object" ?
          {
            name: typeof secondaryRaw.name === "string" ? secondaryRaw.name : "",
            title: typeof secondaryRaw.title === "string" ? secondaryRaw.title : "",
            email: typeof secondaryRaw.email === "string" ? secondaryRaw.email : "",
            phone: typeof secondaryRaw.phone === "string" ? secondaryRaw.phone : "",
          }
        : undefined,
      npsContacts,
      npsHistory,
    };
  }));

  const avgLatest = npsAgencyAverageLatest(clientList);
  const buckets = npsLatestDistributionBuckets(clientList);
  const withData = Math.max(1, buckets.withData);
  const promoterRatio = buckets.promoters / withData;
  const passiveRatio = buckets.passive / withData;
  const detractorRatio = buckets.detractors / withData;
  const trendSeries = npsAgencyTrendMonthly(clientList, period);

  /** Period-scoped response stats (Mongo timestamps) */
  const inPeriod = [];
  for (let pi = 0; pi < allResponses.length; pi += 1) {
    const r = /** @type {Record<string, unknown>} */ (allResponses[pi]);
    const respAt = r.respondedAt ? new Date(String(r.respondedAt)) : null;
    if (!respAt || Number.isNaN(respAt.getTime())) continue;
    if (respAt >= monthStart && respAt <= monthEnd) inPeriod.push(r);
  }

  const invitationsFromResponses = allResponses.filter((r) => {
    const t = /** @type {Record<string, unknown>} */ (r);
    const sentAt = t.sentAt ? new Date(String(t.sentAt)) : null;
    return sentAt && !Number.isNaN(sentAt.getTime()) && sentAt >= monthStart && sentAt <= monthEnd;
  }).length;

  const invitationsFromSendLog = await NpsSendLog.countDocuments(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, {
        status: "sent",
        sentAt: { $gte: monthStart, $lte: monthEnd },
      })
    ),
  );

  const invitationsPeriod = Math.max(invitationsFromResponses, invitationsFromSendLog);

  /** @type {number[]} */
  const hoursToRespond = [];
  for (let hi = 0; hi < inPeriod.length; hi += 1) {
    const r = /** @type {Record<string, unknown>} */ (inPeriod[hi]);
    const sent = r.sentAt ? new Date(String(r.sentAt)) : null;
    const resp = r.respondedAt ? new Date(String(r.respondedAt)) : null;
    if (sent && resp && !Number.isNaN(sent.getTime()) && !Number.isNaN(resp.getTime())) {
      hoursToRespond.push((resp.getTime() - sent.getTime()) / 3600000);
    }
  }

  const responsesPeriod = inPeriod.length;
  const rr = invitationsPeriod > 0 ? responsesPeriod / invitationsPeriod : 0;
  const medianHoursToRespond = Math.round(median(hoursToRespond) * 10) / 10;

  /** @type {{ id: string; name: string; subject: string; body: string; isDefault: boolean }[]} */
  const templates = tmplDocs.map((t) => {
    const tt = /** @type {Record<string, unknown>} */ (t);
    const k = typeof tt.key === "string" ? tt.key : String(tt._id ?? "");
    return {
      id: k,
      name: String(tt.name ?? k),
      subject: String(tt.subject ?? ""),
      body: String(tt.bodyMd ?? ""),
      isDefault: Boolean(tt.isDefault),
    };
  });

  const campDocs = await NpsCampaign.find(/** @type {Record<string, unknown>} */ (andQuery(scope)))
    .sort({ scheduledAt: 1 })
    .limit(24)
    .lean()
    .then((docs) => (Array.isArray(docs) ? docs : []));

  /** @type {Record<string, string>} */
  const slugByOid = {};
  for (let ci = 0; ci < clientDocs.length; ci += 1) {
    const d = clientDocs[ci];
    const oid = d._id != null ? String(d._id) : "";
    const slug = typeof d.slug === "string" ? d.slug.trim() : oid;
    if (oid) slugByOid[oid] = slug;
  }

  /** @type {{ id: string; clientId: string; wave: string; plannedAt: string; templateId: string; status: string }[]} */
  const campaignSends = campDocs
    .map((c, idx) => {
      const row = /** @type {Record<string, unknown>} */ (c);
      const id = typeof row._id !== "undefined" ? String(row._id) : `cmp-${idx}`;
      const cids = Array.isArray(row.clientIds) ? row.clientIds : [];
      const firstCid = cids[0] != null ? String(cids[0]) : "";
      const clientSlug = firstCid ? (slugByOid[firstCid] ?? firstCid) : "—";
      const tid = row.templateId != null ? String(row.templateId) : "";
      const templateKey = tid ? tmplKeyByOid[tid] ?? tid : "—";
      const planned = row.scheduledAt ? toIsoDateOnly(row.scheduledAt) : "";
      const st = String(row.status ?? "draft");
      return {
        id,
        clientId: clientSlug,
        wave: String(row.name ?? "Kampagne"),
        plannedAt: planned || toIsoDateOnly(new Date()),
        templateId: templateKey,
        status: st === "sending" ? "scheduled" : st,
      };
    })
    .filter((row) => row.status !== "cancelled" && row.status !== "completed");

  const settings = await fetchNpsSettings({ includeTest: Boolean(opts.includeTest) });
  const scheduleWaves = buildScheduleWavesFromSettings(settings);
  const upcomingSends = [...scheduleWaves, ...campaignSends];

  const sendLog = await fetchNpsSendLogSummary({ includeTest: Boolean(opts.includeTest) });

  /** @type {Record<string, string>} */
  const clientNameBySlug = {};
  for (let cni = 0; cni < clientDocs.length; cni += 1) {
    const d = clientDocs[cni];
    const slug = typeof d.slug === "string" ? d.slug.trim() : "";
    if (slug) clientNameBySlug[slug] = String(d.name ?? slug);
  }

  const recentResponsesRaw = await NpsResponse.find(/** @type {Record<string, unknown>} */ (andQuery(scope)))
    .sort({ respondedAt: -1 })
    .limit(24)
    .lean();

  const recentResponses = (Array.isArray(recentResponsesRaw) ? recentResponsesRaw : []).map((row) => {
    const r = /** @type {Record<string, unknown>} */ (row);
    const slug = String(r.clientSlug ?? "");
    const rawScore = Number(r.score);
    const comment = typeof r.comment === "string" && r.comment.trim() ? r.comment.trim() : "";
    return {
      id: r._id != null ? String(r._id) : "",
      clientSlug: slug,
      clientName: clientNameBySlug[slug] ?? slug,
      contactEmail: String(r.contactEmail ?? ""),
      score: Number.isFinite(rawScore) ? rawScore : null,
      displayScore: normalizeNpsDisplayScore(rawScore),
      comment,
      respondedAt: r.respondedAt ? toIsoDateOnly(r.respondedAt) : "",
    };
  });

  return {
    source: "database",
    reportPeriod: { year: period.year, month: period.month },
    reportPeriodLabel: formatReportPeriodLabel(period.year, period.month),
    reportPeriodSubtitle: formatReportPeriodSubtitle(period.year, period.month),
    avgLatest,
    avgPrev: npsAgencyAveragePrevious(clientList),
    measured: npsActiveClientsMeasured(clientList).length,
    rollupTotal: npsDashboardClients(clientList).length,
    distribution: buckets,
    promoterRatio,
    passiveRatio,
    detractorRatio,
    responseRate: Number.isFinite(rr) ? rr : 0,
    lastRound: {
      invitations: invitationsPeriod,
      responses: responsesPeriod,
      medianHoursToRespond,
    },
    lastRoundCaptionDemo: false,
    trend: trendSeries.values,
    trendLabels: trendSeries.labels,
    atRisk: npsAtRiskLatestCount(clientList),
    improving: npsImprovingClientsCount(2, clientList),
    clients: npsDashboardClients(clientList),
    templates,
    upcomingSends,
    sendLog,
    recentResponses,
    settings,
  };
}
