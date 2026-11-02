import { computeClv } from "@/lib/crm/client-utils";
import {
  aggregateBrandClients,
  clientGroupHref,
  defaultGroupName,
  normalizeCvr,
  normalizeGroupKey,
} from "@/lib/crm/client-groups";
import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
import {
  endOfReportMonth,
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import { enrichClientRetainer, sumContributingContractRetainer } from "@/lib/crm/retainer-utils";
import Client from "@/lib/db/models/client";
import ClientDomain from "@/lib/db/models/client-domain";
import ClientGroup from "@/lib/db/models/client-group";
import Contract from "@/lib/db/models/contract";
import Note from "@/lib/db/models/note";
import NpsResponse from "@/lib/db/models/nps-response";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { connectDb } from "@/lib/db/mongoose";
import {
  andQuery,
  buildAlertsForPortfolio,
  embedContact,
  formatNoteAt,
  mapFromMaybeMap,
  mapTeamMembers,
  normalizeNpsDisplayScore,
  normalizeTaskUiStatus,
  toIsoDateOnly,
} from "@/lib/server/client-detail-data";
import { resolveGroupMemberDocs } from "@/lib/server/client-group-members";
import { enrichMembersWithUserImages, userImageByUserId } from "@/lib/server/member-user-images";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {string} name */
function newExplicitGroupKey(name) {
  const slug = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `g-${slug || "koncern"}-${rand}`;
}

/** @param {Record<string, unknown>} scope */
function testFlag(scope) {
  return scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {};
}

/**
 * Samlet detalje-bundle for en koncern (alle brands med samme CVR) — samme form som
 * `fetchClientDetailBundle`, så den eksisterende kunde-side kan genbruges 1:1.
 *
 * @param {{ cvr: string; includeTest?: boolean; year?: number; month?: number }} opts
 */
export async function fetchClientGroupDetailBundle(opts) {
  const includeTest = Boolean(opts.includeTest);
  const cvr = normalizeGroupKey(opts.cvr);
  if (!cvr) return { error: "Ugyldig koncern-nøgle", status: 400 };

  const { year, month } = normalizeReportPeriod(opts);

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(includeTest ? "all" : "production")
  );

  const memberDocs = await resolveGroupMemberDocs(cvr, scope);
  if (memberDocs.length === 0) return { error: "Ikke fundet", status: 404 };
  if (memberDocs.length === 1) {
    return {
      error: "Kunden er ikke en del af en koncern",
      status: 404,
      redirectSlug: String(memberDocs[0].slug ?? memberDocs[0]._id),
    };
  }

  const memberIds = memberDocs.map((d) => d._id);
  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);

  const clientScope = andQuery({ clientId: { $in: memberIds } }, scope);

  const [groupDoc, entries, teamRaw, contractDocs, tasksRaw, notesRaw, npsRaw, domainRaw] =
    await Promise.all([
      ClientGroup.findOne({ cvr }).lean(),
      TimeEntry.find({
        clientId: { $in: memberIds },
        workedAt: { $gte: monthStart, $lt: monthEnd },
        billable: { $ne: false },
      })
        .select("clientId durationMinutes")
        .lean(),
      TeamMember.find(andQuery({ active: { $ne: false } }, scope)).sort({ name: 1 }).lean(),
      Contract.find(clientScope).sort({ updatedAt: -1 }).limit(120).lean(),
      Task.find(clientScope).sort({ dueDate: 1 }).limit(80).lean(),
      Note.find({ clientId: { $in: memberIds } }).sort({ occurredAt: -1 }).limit(40).lean(),
      NpsResponse.find({ clientId: { $in: memberIds } }).sort({ respondedAt: -1 }).limit(60).lean(),
      ClientDomain.find({ clientId: { $in: memberIds } })
        .sort({ isPrimary: -1, domain: 1 })
        .lean(),
    ]);

  /** @type {Record<string, number>} */
  const minutesById = {};
  for (const e of entries) {
    const id = String(e.clientId);
    minutesById[id] = (minutesById[id] ?? 0) + (Number(e.durationMinutes) || 0);
  }
  /** @type {Record<string, number>} */
  const hoursMap = {};
  for (const [id, minutes] of Object.entries(minutesById)) {
    hoursMap[id] = Math.round((minutes / 60) * 10) / 10;
  }

  /** @param {Record<string, any>[]} rows */
  const groupByClientId = (rows) => {
    /** @type {Map<string, Record<string, any>[]>} */
    const map = new Map();
    for (const r of rows) {
      const id = String(r.clientId);
      const list = map.get(id);
      if (list) list.push(r);
      else map.set(id, [r]);
    }
    return map;
  };
  const contractsByClient = groupByClientId(contractDocs);
  const npsByClient = groupByClientId(npsRaw);
  const domainsByClient = groupByClientId(domainRaw);

  const slugById = new Map(memberDocs.map((d) => [String(d._id), String(d.slug ?? d._id)]));
  const nameById = new Map(memberDocs.map((d) => [String(d._id), String(d.name ?? "")]));

  const pulseBrands = memberDocs.map((doc) => mapClientForPulse(doc, hoursMap));

  const detailBrands = memberDocs.map((doc, i) => {
    const id = String(doc._id);
    const slug = slugById.get(id) ?? id;
    const contracts = contractsByClient.get(id) ?? [];
    const contractSum = sumContributingContractRetainer(contracts);
    const staticRetainer = typeof doc.retainerAmount === "number" ? doc.retainerAmount : 0;
    const startedAt = toIsoDateOnly(doc.startedAt) || "";

    return enrichClientRetainer(
      {
        ...pulseBrands[i],
        id: slug,
        startedAt,
        renewalAt: toIsoDateOnly(doc.renewalAt) || "",
        cvr: typeof doc.cvr === "string" ? doc.cvr : undefined,
        deptAssignees: mapFromMaybeMap(doc.deptAssignees) ?? undefined,
        clv: computeClv({
          startedAt,
          terminatedAt: toIsoDateOnly(doc.terminatedAt) || null,
          retainer: staticRetainer + contractSum,
        }),
        domains: (domainsByClient.get(id) ?? []).map((d) => ({
          id: typeof d.staticId === "string" ? d.staticId : String(d._id),
          clientId: slug,
          domain: String(d.domain ?? ""),
          locale: String(d.locale ?? ""),
          isPrimary: Boolean(d.isPrimary),
          cms: typeof d.cms === "string" ? d.cms : null,
        })),
        primaryContact: embedContact(doc.primaryContact) ?? undefined,
        secondaryContact: embedContact(doc.secondaryContact) ?? undefined,
        npsHistory: (npsByClient.get(id) ?? [])
          .map((r) => {
            const responded = r.respondedAt ? new Date(String(r.respondedAt)) : null;
            const sent = r.sentAt ? new Date(String(r.sentAt)) : responded;
            return {
              score: normalizeNpsDisplayScore(Number(r.score)),
              sentAt: toIsoDateOnly(sent) || "",
              respondedAt: toIsoDateOnly(responded) || "",
              comment: typeof r.comment === "string" ? r.comment : "",
            };
          })
          .reverse(),
        npsInterval: String(doc.npsInterval ?? "quarterly"),
      },
      contractSum,
    );
  });

  const customName =
    typeof groupDoc?.name === "string" && groupDoc.name.trim() ? groupDoc.name.trim() : "";
  const name = customName || defaultGroupName(detailBrands);

  const aggregated = aggregateBrandClients(detailBrands, { cvr, name });
  const primaryContact =
    aggregated.primaryContact ?? {
      name: "Ingen primær kontakt registreret",
      title: "",
      email: "",
      phone: "",
    };

  const brands = [...detailBrands]
    .sort((a, b) => (b.retainer ?? 0) - (a.retainer ?? 0))
    .map((b) => ({
      id: b.id,
      name: b.name,
      industry: b.industry ?? "",
      logo: b.logo,
      hue: b.hue,
      currency: b.currency,
      status: b.status,
      health: b.health,
      retainer: b.retainer,
      hoursThisMonth: b.hoursThisMonth,
      hoursBudget: b.hoursBudget,
      owner: b.owner,
      cvr: b.cvr,
    }));

  const detailClient = {
    ...aggregated,
    primaryContact,
    infoMd: typeof groupDoc?.infoMd === "string" ? groupDoc.infoMd : "",
    brands,
  };

  const teamEnriched = Array.isArray(teamRaw) ? await enrichMembersWithUserImages(teamRaw) : [];
  const team = mapTeamMembers(teamEnriched);

  let ownerPulse = null;
  if (detailClient.owner) {
    const ownerDoc = await TeamMember.findOne(
      andQuery({ key: detailClient.owner }, scope),
    ).lean();
    if (ownerDoc) {
      const image = ownerDoc.userId != null ? await userImageByUserId(String(ownerDoc.userId)) : null;
      ownerPulse = mapTeamMembers([image ? { ...ownerDoc, image } : ownerDoc])[0];
    }
  }

  const tasks = tasksRaw.map((t) => ({
    id: String(t._id),
    title: `${nameById.get(String(t.clientId)) ?? "—"} · ${String(t.title ?? "—")}`,
    status: normalizeTaskUiStatus(String(t.status)),
    priority: /** @type {'low'|'medium'|'high'} */ (String(t.priority ?? "medium")),
    dueDate: toIsoDateOnly(t.dueDate) || new Date().toISOString().slice(0, 10),
  }));

  const notes = notesRaw.map((n) => ({
    id: String(n._id),
    who: String(n.authorMemberKey ?? "note"),
    at: formatNoteAt(n.occurredAt),
    type: String(n.type ?? "note"),
    body: `${nameById.get(String(n.clientId)) ?? ""}: ${String(n.body ?? "")}`.replace(/^: /, ""),
  }));

  const retainerHistory =
    detailClient.retainer > 0 ?
      [
        {
          month: formatReportPeriodLabel(year, month),
          retainer: detailClient.retainer,
          currency: detailClient.currency,
        },
      ]
    : [];

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
    // Aftaler ligger pr. brand; koncern-siden viser samlet MRR og renewal i stedet.
    contract: null,
    notes,
    tasks,
    alerts: buildAlertsForPortfolio(pulseBrands),
    retainerHistory,
    group: null,
    kpiTimerLabel: isCurrentReportPeriod(year, month) ? "Timer denne md" : "Timer i perioden",
  };
}

/**
 * Opret/udvid en koncern ved at give valgte kunder samme CVR.
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} body `{ cvr, name, memberSlugs: string[] }`
 */
export async function createClientGroupMongo(includeTest, body) {
  // Fælles CVR er valgfrit: uden CVR laves en manuel koncern på tværs af forskellige CVR'er.
  const cvrRaw = String(body.cvr ?? "").trim();
  const sharedCvr = cvrRaw ? normalizeCvr(cvrRaw) : "";
  if (cvrRaw && !sharedCvr) return { error: "CVR skal være 8 cifre (og ikke ens cifre)", status: 400 };

  const name = String(body.name ?? "").trim();
  if (!name) return { error: "Koncernnavn er påkrævet", status: 400 };

  const slugs = Array.isArray(body.memberSlugs) ?
      [...new Set(body.memberSlugs.map((s) => String(s).trim()).filter(Boolean))]
    : [];
  if (slugs.length < 2) return { error: "Vælg mindst to kunder at gruppere", status: 400 };

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(includeTest ? "all" : "production")
  );

  const docs = await Client.find(andQuery({ slug: { $in: slugs } }, scope))
    .select("_id slug cvr groupKey")
    .lean();
  if (docs.length !== slugs.length) {
    return { error: "Én eller flere valgte kunder findes ikke", status: 404 };
  }
  const ids = docs.map((d) => d._id);

  /** @type {string} */
  let key;
  if (sharedCvr) {
    // Samme CVR: koncernen er afledt af CVR'et, så en evt. manuel nøgle fjernes.
    key = sharedCvr;
    await Client.updateMany({ _id: { $in: ids } }, { $set: { cvr: sharedCvr }, $unset: { groupKey: 1 } });
  } else {
    // Manuel koncern på tværs af CVR'er: genbrug en eksisterende manuel nøgle hvis én af brandene har den.
    const existing = docs
      .map((d) => normalizeGroupKey(d.groupKey))
      .find((k) => k && !/^\d{8}$/.test(k));
    key = existing ?? newExplicitGroupKey(name);
    await Client.updateMany({ _id: { $in: ids } }, { $set: { groupKey: key } });
  }

  await ClientGroup.updateOne(
    { cvr: key },
    { $set: { name, ...testFlag(scope) } },
    { upsert: true },
  );

  const members = await resolveGroupMemberDocs(key, scope);
  return {
    ok: /** @type {const} */ (true),
    cvr: key,
    name,
    memberCount: members.length,
    href: clientGroupHref(key),
  };
}

/**
 * Opdater koncernens navn / kundeinfo.
 * @param {string} cvrRaw
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} patch `{ name?, infoMd? }`
 */
export async function updateClientGroupMongo(cvrRaw, includeTest, patch) {
  const cvr = normalizeGroupKey(cvrRaw);
  if (!cvr) return { error: "Ugyldig koncern-nøgle", status: 400 };

  /** @type {Record<string, unknown>} */
  const $set = {};
  if ("name" in patch) {
    const name = String(patch.name ?? "").trim();
    if (!name) return { error: "Koncernnavn er påkrævet", status: 400 };
    $set.name = name;
  }
  if ("infoMd" in patch) $set.infoMd = patch.infoMd == null ? "" : String(patch.infoMd);
  if (!Object.keys($set).length) return { error: "Ingen felter at opdatere", status: 400 };

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(includeTest ? "all" : "production")
  );

  const members = await resolveGroupMemberDocs(cvr, scope);
  if (members.length < 2) return { error: "Koncernen findes ikke", status: 404 };

  // `name` er påkrævet ved første oprettelse — udled det hvis der kun opdateres kundeinfo.
  const existing = await ClientGroup.findOne({ cvr }).select("name").lean();
  if (!existing && !$set.name) {
    $set.name = defaultGroupName(
      members.map((m) => ({
        name: String(m.name ?? ""),
        retainer: typeof m.retainerAmount === "number" ? m.retainerAmount : 0,
      })),
    );
  }

  await ClientGroup.updateOne({ cvr }, { $set: { ...$set, ...testFlag(scope) } }, { upsert: true });
  return { ok: /** @type {const} */ (true), cvr };
}
