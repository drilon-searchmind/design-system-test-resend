import {
  CLIENTS,
  UPSELLS,
  CONTRACTS,
  DEPARTMENTS,
  NOTES_BY_CLIENT,
  NPS_TEMPLATES,
  TASKS,
  TASK_TEMPLATES,
  TEAM,
} from "@/lib/crm/static-data";
import { DOMAINS } from "@/lib/crm/domains-data";
import Client from "@/lib/db/models/client";
import ClientDomain from "@/lib/db/models/client-domain";
import Contact from "@/lib/db/models/contact";
import Contract from "@/lib/db/models/contract";
import ContractTemplate from "@/lib/db/models/contract-template";
import {
  DEFAULT_CONTRACT_TEMPLATE_DOCUMENT,
  DEFAULT_CONTRACT_TEMPLATE_EMAIL,
  DEFAULT_CONTRACT_TEMPLATE_SUBJECT,
  STARTER_CONTRACT_TEMPLATES,
} from "@/lib/crm/contract-template-defaults";
import Department from "@/lib/db/models/department";
import KnowledgeArticle from "@/lib/db/models/knowledge-article";
import NpsResponse from "@/lib/db/models/nps-response";
import NpsTemplate from "@/lib/db/models/nps-template";
import Note from "@/lib/db/models/note";
import Task from "@/lib/db/models/task";
import Upsell from "@/lib/db/models/upsell";
import TaskTemplate from "@/lib/db/models/task-template";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";

/** @param {string | undefined | null} s */
function parseIsoDate(s) {
  if (!s || typeof s !== "string") return undefined;
  const trimmed = s.trim();
  const d = new Date(trimmed.length <= 10 ? `${trimmed}T12:00:00` : trimmed.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** @param {string | undefined | null} s */
function parseNoteAt(s) {
  if (!s || typeof s !== "string") return new Date();
  const d = new Date(s.trim().replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** @param {string} color */
function colorTokenFromVar(color) {
  const m = String(color).match(/var\(--([^)]+)\)/);
  return m ? m[1] : "dep-seo";
}

/** @param {string} kind */
function contractTypeFromKind(kind) {
  if (kind === "Projekt") return "project";
  return "retainer";
}

/** @param {string} accountStatus */
function contractStatusFromAccount(accountStatus) {
  if (accountStatus === "inactive") return "ended";
  return "active";
}

/** @param {Record<string, unknown> | undefined | null} contact */
function embedContactDoc(contact) {
  if (!contact || typeof contact !== "object") return undefined;
  return {
    name: contact.name ? String(contact.name) : undefined,
    title: contact.title ? String(contact.title) : undefined,
    email: contact.email ? String(contact.email) : undefined,
    phone: contact.phone ? String(contact.phone) : undefined,
    lastContactedAt: parseIsoDate(
      typeof contact.lastContactedAt === "string" ? contact.lastContactedAt : undefined,
    ),
    linkedinUrl:
      typeof contact.linkedinUrl === "string" ? contact.linkedinUrl : undefined,
    isPrimary: Boolean(contact.isPrimary),
  };
}

/** @param {number} score */
function npsScoreForDb(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  return s > 10 ? Math.round(s / 10) : Math.round(s);
}

/** Seed production demo data from static CRM fixtures (relations preserved). */
export async function seedDemoFromStatic() {
  await connectDb();

  /** @type {Record<string, import('mongoose').Document>} */
  const depByKey = {};
  for (let i = 0; i < DEPARTMENTS.length; i += 1) {
    const d = DEPARTMENTS[i];
    depByKey[d.id] = await Department.create({
      key: d.id,
      name: d.name,
      shortLabel: d.short,
      capacityHours: d.capacity,
      colorToken: colorTokenFromVar(d.color),
    });
  }

  /** @type {Record<string, import('mongoose').Document>} */
  const memberByKey = {};
  for (let mi = 0; mi < TEAM.length; mi += 1) {
    const m = TEAM[mi];
    const dep = depByKey[m.dept];
    if (!dep) continue;
    memberByKey[m.id] = await TeamMember.create({
      key: m.id,
      name: m.name,
      roleTitle: m.role,
      departmentId: dep._id,
      departmentKey: m.dept,
      avatarInitials: m.avatar,
      hue: m.hue,
      weeklyHours: m.weeklyHours,
      active: true,
    });
  }

  /** @type {Record<string, import('mongoose').Document>} */
  const clientBySlug = {};

  for (let ci = 0; ci < CLIENTS.length; ci += 1) {
    const c = CLIENTS[ci];
    const owner = memberByKey[c.owner];
    const allocation = c.allocation && typeof c.allocation === "object" ? c.allocation : {};
    const deptAssignees =
      c.deptAssignees && typeof c.deptAssignees === "object" ? c.deptAssignees : {};

    const clientDoc = await Client.create({
      slug: c.id,
      name: c.name,
      industry: c.industry,
      logoInitials: c.logo,
      hue: c.hue,
      currency: c.currency,
      retainerAmount: c.retainer,
      oneOffWebAmount: c.oneOffWebAmount,
      serviceAgreementAnnual: c.serviceAgreementAnnual,
      serviceBudgets: c.serviceBudgets && Object.keys(c.serviceBudgets).length ? c.serviceBudgets : undefined,
      startedAt: parseIsoDate(c.startedAt),
      renewalAt: parseIsoDate(c.renewalAt),
      status: c.status,
      health: c.health,
      ownerMemberKey: c.owner,
      ownerId: owner?._id,
      allocation,
      servicesActive: c.servicesActive ?? [],
      tags: c.tags ?? [],
      primaryContact: embedContactDoc(c.primaryContact),
      secondaryContact: embedContactDoc(c.secondaryContact),
      hoursThisMonth: c.hoursThisMonth,
      hoursBudget: c.hoursBudget,
      monthlyProfitMargin: c.monthlyProfitMargin,
      utilisationHistory: c.utilisationHistory ?? [],
      npsInterval: c.npsInterval ?? "quarterly",
      lastActivityLabel: c.lastActivity,
      cvr: c.cvr,
      terminatedAt: parseIsoDate(c.terminatedAt),
      churnReason: c.churnReason ?? [],
      churnNote: c.churnNote ?? undefined,
      infoMd: typeof c.infoMd === "string" ? c.infoMd : undefined,
      leadSource: c.leadSource,
      googleDriveUrl: c.googleDriveUrl,
      annualAdjustmentPct: c.annualAdjustmentPct,
      lastContactedAt: parseIsoDate(c.lastContactedAt),
      deptAssignees,
    });
    clientBySlug[c.id] = clientDoc;

    if (c.primaryContact?.name) {
      await Contact.create({
        clientId: clientDoc._id,
        name: c.primaryContact.name,
        title: c.primaryContact.title,
        email: c.primaryContact.email,
        phone: c.primaryContact.phone,
        isPrimary: true,
        lastContactedAt: parseIsoDate(c.primaryContact.lastContactedAt),
        linkedinUrl: c.primaryContact.linkedinUrl ?? undefined,
      });
    }
    if (c.secondaryContact?.name) {
      await Contact.create({
        clientId: clientDoc._id,
        name: c.secondaryContact.name,
        title: c.secondaryContact.title,
        email: c.secondaryContact.email,
        phone: c.secondaryContact.phone,
        isPrimary: false,
        lastContactedAt: parseIsoDate(c.secondaryContact.lastContactedAt),
        linkedinUrl: c.secondaryContact.linkedinUrl ?? undefined,
      });
    }

    if (Array.isArray(c.npsHistory)) {
      for (let ni = 0; ni < c.npsHistory.length; ni += 1) {
        const nps = c.npsHistory[ni];
        await NpsResponse.create({
          clientId: clientDoc._id,
          clientSlug: c.id,
          score: npsScoreForDb(nps.score),
          sentAt: parseIsoDate(nps.sentAt),
          respondedAt: parseIsoDate(nps.respondedAt),
        });
      }
    }
  }

  for (let ctrI = 0; ctrI < CONTRACTS.length; ctrI += 1) {
    const ctr = CONTRACTS[ctrI];
    const client = clientBySlug[ctr.clientId];
    if (!client) continue;
    await Contract.create({
      key: ctr.id,
      clientId: client._id,
      clientSlug: ctr.clientId,
      type: contractTypeFromKind(ctr.kind),
      label: ctr.kind,
      value: ctr.monthlyValue,
      currency: ctr.currency,
      startDate: parseIsoDate(ctr.startedAt),
      renewalDate: parseIsoDate(ctr.renewalAt),
      status: contractStatusFromAccount(ctr.accountStatus),
      documentUrl: ctr.documentUrl,
      signedBy: ctr.signedBy ?? undefined,
      noticeDays: ctr.noticeDays,
      serviceLines: ctr.serviceLines?.length ? ctr.serviceLines : undefined,
      servicesActive: ctr.serviceLines?.map((l) => l.key) ?? [],
    });
  }

  // Demo: kontraktskabeloner (standard + starter-skabeloner til ny/eksisterende kunde).
  await ContractTemplate.create({
    key: "standard-retainer",
    name: "Standard retaineraftale",
    subject: DEFAULT_CONTRACT_TEMPLATE_SUBJECT,
    emailBodyMd: DEFAULT_CONTRACT_TEMPLATE_EMAIL,
    documentBodyMd: DEFAULT_CONTRACT_TEMPLATE_DOCUMENT,
    defaultType: "retainer",
    defaultNoticeDays: 90,
    isDefault: true,
    active: true,
  });
  for (const t of STARTER_CONTRACT_TEMPLATES) {
    await ContractTemplate.create({ ...t, isDefault: false, active: true });
  }

  // Demo: ventende kontrakter — opsalg til eksisterende kunde + ny kunde (viser "Ny kunde" i listen).
  const upsellClient = clientBySlug["c-folio"];
  if (upsellClient) {
    await Contract.create({
      key: "ctr-demo-upsell-folio",
      clientId: upsellClient._id,
      clientSlug: "c-folio",
      type: "retainer",
      label: "Opsalg — Content + Email",
      value: 69000,
      currency: "DKK",
      startDate: new Date(),
      status: "pending_signature",
      noticeDays: 90,
      servicesActive: ["seo", "ppc", "social", "content", "email"],
      serviceLines: [
        { key: "seo", name: "SEO", amount: 20000 },
        { key: "ppc", name: "PPC", amount: 17000 },
        { key: "social", name: "Paid Social", amount: 12000 },
        { key: "content", name: "Content", amount: 12000 },
        { key: "email", name: "E-mail", amount: 8000 },
      ],
      signedBy: undefined,
    });
  }
  await Contract.create({
    key: "ctr-demo-prospect-fjord",
    type: "retainer",
    label: "Ny kunde — SEO + PPC + web",
    value: 40000,
    currency: "DKK",
    startDate: new Date(),
    status: "pending_signature",
    noticeDays: 90,
    servicesActive: ["seo", "ppc"],
    serviceLines: [
      { key: "seo", name: "SEO", amount: 22000 },
      { key: "ppc", name: "PPC", amount: 18000 },
      { key: "oneoff-web", name: "Web (engangs)", amount: 55000 },
    ],
    prospect: {
      name: "Fjord Energi A/S",
      cvr: "30998877",
      domain: "fjordenergi.dk",
      industry: "Energy",
      leadSource: "linkedin",
      ownerMemberKey: TEAM[0]?.id,
      contactName: "Mette Fjord",
      contactTitle: "Marketingchef",
      contactEmail: "mette@fjordenergi.dk",
    },
  });

  for (const u of UPSELLS) {
    const client = clientBySlug[u.clientId ?? ""];
    if (!client) continue;
    await Upsell.create({
      clientId: client._id,
      clientSlug: u.clientId,
      type: u.type,
      amount: u.amount,
      currency: u.currency,
      periodFrom: u.periodFrom,
      periodTo: u.periodTo,
      soldBy: u.soldBy,
      soldByKey: u.soldByKey,
      soldAt: parseIsoDate(u.soldAt),
      department: u.department,
      description: u.description,
      createdBy: "demo",
    });
  }

  for (let di = 0; di < DOMAINS.length; di += 1) {
    const dom = DOMAINS[di];
    const client = clientBySlug[dom.clientId];
    if (!client) continue;
    await ClientDomain.create({
      clientId: client._id,
      clientSlug: dom.clientId,
      staticId: dom.id,
      domain: dom.domain,
      locale: dom.locale,
      isPrimary: dom.isPrimary,
      cms: dom.cms ?? undefined,
    });
  }

  for (let ti = 0; ti < TASK_TEMPLATES.length; ti += 1) {
    const tpl = TASK_TEMPLATES[ti];
    const dep = depByKey[tpl.dept];
    await TaskTemplate.create({
      key: tpl.id,
      title: tpl.name,
      description: tpl.hint ?? "",
      departmentId: dep?._id,
      departmentKey: tpl.dept,
      defaultPriority: tpl.defaultPriority ?? "medium",
      suggestedHours: tpl.estHours,
      defaultDueOffsetDays: tpl.defaultDueOffsetDays,
      scope: tpl.scope ?? "retainer",
      checklist: [],
      active: tpl.active ?? true,
    });
  }

  for (let tskI = 0; tskI < TASKS.length; tskI += 1) {
    const t = TASKS[tskI];
    const client = clientBySlug[t.clientId];
    if (!client) continue;
    const dep = t.dept && t.dept !== "—" ? depByKey[t.dept] : null;
    const mem = t.assigneeId ? memberByKey[t.assigneeId] : null;
    await Task.create({
      clientId: client._id,
      clientSlug: t.clientId,
      title: t.title,
      hint: t.hint ?? "",
      departmentId: dep?._id,
      departmentKey: t.dept && t.dept !== "—" ? t.dept : undefined,
      assigneeMemberKey: t.assigneeId,
      assigneeId: mem?._id,
      status: t.status,
      priority: t.priority,
      dueDate: parseIsoDate(t.dueDate),
      estimateHours: t.estimateHours,
      loggedHours: t.loggedHours ?? 0,
    });
  }

  const noteClientSlugs = Object.keys(NOTES_BY_CLIENT);
  for (let nci = 0; nci < noteClientSlugs.length; nci += 1) {
    const clientSlug = noteClientSlugs[nci];
    const client = clientBySlug[clientSlug];
    const notes = NOTES_BY_CLIENT[clientSlug];
    if (!client || !Array.isArray(notes)) continue;
    for (let ni = 0; ni < notes.length; ni += 1) {
      const n = notes[ni];
      const author = memberByKey[n.who];
      await Note.create({
        key: `${clientSlug}-${n.id}`,
        clientId: client._id,
        clientSlug,
        authorMemberKey: n.who,
        authorId: author?._id,
        type: n.type ?? "note",
        body: n.body,
        occurredAt: parseNoteAt(n.at),
      });
    }
  }

  for (let nti = 0; nti < NPS_TEMPLATES.length; nti += 1) {
    const nt = NPS_TEMPLATES[nti];
    await NpsTemplate.create({
      key: nt.id,
      name: nt.name,
      subject: nt.subject,
      bodyMd: nt.body,
      locale: "da",
      active: true,
      isDefault: nt.id === "default",
    });
  }

  return {
    ok: true,
    counts: {
      departments: DEPARTMENTS.length,
      team: TEAM.length,
      clients: CLIENTS.length,
      upsells: UPSELLS.length,
      contracts: CONTRACTS.length,
      domains: DOMAINS.length,
      taskTemplates: TASK_TEMPLATES.length,
      tasks: TASKS.length,
      knowledgeArticles: 0,
      npsTemplates: NPS_TEMPLATES.length,
    },
  };
}
