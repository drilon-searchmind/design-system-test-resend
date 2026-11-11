import { createHash } from "node:crypto";

import { monthKey } from "@/lib/crm/upsell-utils";
import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import Contract from "@/lib/db/models/contract";
import Department from "@/lib/db/models/department";
import Note from "@/lib/db/models/note";
import NpsResponse from "@/lib/db/models/nps-response";
import Task from "@/lib/db/models/task";
import TaskComment from "@/lib/db/models/task-comment";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import Upsell from "@/lib/db/models/upsell";
import { connectDb } from "@/lib/db/mongoose";

export const TEST_CUSTOMER_SLUG = "c-testkunde-aps";
const TEST = { isTest: true };

/** @param {number} days */
function daysAgo(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}
/** @param {number} days */
function daysFromNow(days) {
  return daysAgo(-days, 12);
}

const CONTRACT_BODY = `# Samarbejdsaftale — Testkunde ApS

## 1. Ydelser
- SEO (9.000 kr / md)
- PPC (7.000 kr / md)

## 2. Vederlag
Månedligt vederlag (MRR): **16.000 kr** ekskl. moms, faktureret månedligt forud.

## 3. Varighed
Aftalen løber til den opsiges med **90 dages** varsel.

*Dette er en testkontrakt til intern afprøvning.*
`;

/** Fjern testkunden og alt der hører til den. */
export async function removeTestCustomer() {
  await connectDb();
  const client = await Client.findOne({ slug: TEST_CUSTOMER_SLUG }).select("_id").lean();
  if (!client) return { removed: false };
  const clientId = client._id;
  await Promise.all([
    Task.deleteMany({ clientId }),
    TaskComment.deleteMany({ clientId }),
    TimeEntry.deleteMany({ clientId }),
    Contact.deleteMany({ clientId }),
    Contract.deleteMany({ clientId }),
    Upsell.deleteMany({ clientId }),
    NpsResponse.deleteMany({ clientId }),
    Note.deleteMany({ clientId }),
  ]);
  await Client.deleteOne({ _id: clientId });
  return { removed: true };
}

export async function getTestCustomerStatus() {
  await connectDb();
  const client = await Client.findOne({ slug: TEST_CUSTOMER_SLUG }).select("_id name").lean();
  if (!client) return { exists: false };
  const clientId = client._id;
  const [tasks, contracts, upsells, timeEntries, contacts] = await Promise.all([
    Task.countDocuments({ clientId }),
    Contract.countDocuments({ clientId }),
    Upsell.countDocuments({ clientId }),
    TimeEntry.countDocuments({ clientId }),
    Contact.countDocuments({ clientId }),
  ]);
  return {
    exists: true,
    name: String(client.name ?? ""),
    slug: TEST_CUSTOMER_SLUG,
    counts: { tasks, contracts, upsells, timeEntries, contacts },
  };
}

/**
 * Opret (eller genopret) testkunden med så meget data som muligt.
 * Bruger de rigtige afdelinger og medarbejdere til tildeling; alt oprettet har isTest=true,
 * så det kun vises/tælles når testkunden er slået til i Indstillinger.
 */
export async function seedTestCustomer() {
  await connectDb();
  await removeTestCustomer();

  const [departments, members] = await Promise.all([
    Department.find({ $or: [{ isTest: false }, { isTest: { $exists: false } }] }).lean(),
    TeamMember.find({
      active: { $ne: false },
      $or: [{ isTest: false }, { isTest: { $exists: false } }],
    }).lean(),
  ]);
  if (!members.length) {
    throw new Error("Ingen medarbejdere i databasen — importér eller opret team først.");
  }

  const deptKeys = departments.map((d) => String(d.key));
  /** @param {string} key */
  const deptDoc = (key) => departments.find((d) => d.key === key);
  const pickDepts = ["seo", "ppc", "social", "content"].filter((k) => deptKeys.includes(k));
  const usedDepts = pickDepts.length ? pickDepts : deptKeys.slice(0, 3);

  /** Ét medlem pr. afdeling hvis muligt, ellers fyld op med andre. */
  /** @type {Record<string, import('mongoose').FlattenMaps<Record<string, unknown>>>} */
  const memberByDept = {};
  for (const k of usedDepts) {
    const m = members.find((x) => x.departmentKey === k);
    if (m) memberByDept[k] = m;
  }
  const team = [...new Set(Object.values(memberByDept))];
  for (const m of members) {
    if (team.length >= 4) break;
    if (!team.includes(m)) team.push(m);
  }
  const owner = memberByDept.ppc ?? memberByDept.seo ?? team[0];
  /** @param {number} i */
  const member = (i) => team[i % team.length];
  /** @param {string} k */
  const deptKeyFor = (k, i) => (usedDepts.includes(k) ? k : (usedDepts[i % usedDepts.length] ?? k));
  const seoKey = deptKeyFor("seo", 0);
  const ppcKey = deptKeyFor("ppc", 1);
  const socialKey = deptKeyFor("social", 2);
  const contentKey = deptKeyFor("content", 3);

  const now = new Date();
  const ym = monthKey(now.getFullYear(), now.getMonth() + 1);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYm = monthKey(prev.getFullYear(), prev.getMonth() + 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextYm = monthKey(next.getFullYear(), next.getMonth() + 1);

  // ── Kunde ───────────────────────────────────────────────────────────────
  // MRR = retainerAmount (12.000, inkl. tidligere MRR-opsalg på 4.000) + aktiv kontrakt (16.000) = 28.000
  const budgets = { [seoKey]: 14000, [ppcKey]: 9000, [socialKey]: 5000 };
  const client = await Client.create({
    ...TEST,
    slug: TEST_CUSTOMER_SLUG,
    name: "Testkunde ApS",
    industry: "Test / e-commerce",
    logoInitials: "TK",
    hue: 168,
    currency: "DKK",
    cvr: "99999999",
    retainerAmount: 12000,
    oneOffWebAmount: 20000,
    serviceAgreementAnnual: 24000,
    serviceBudgets: budgets,
    commercialLog: [
      {
        at: daysAgo(70),
        by: String(owner.name ?? "Test"),
        note: "Opsalg: Løft i løbende PPC-budget",
        changes: { retainerAmount: { from: 8000, to: 12000 } },
      },
      {
        at: daysAgo(180),
        by: "Kontrakt",
        note: "Underskrevet kontrakt: Retainer — SEO & PPC",
        changes: {
          [`serviceBudgets.${seoKey}`]: { from: 5000, to: 14000 },
          [`serviceBudgets.${ppcKey}`]: { from: 2000, to: 9000 },
        },
      },
    ],
    startedAt: daysAgo(420),
    renewalAt: daysFromNow(60),
    status: "active",
    health: "ok",
    ownerMemberKey: String(owner.key),
    ownerId: owner._id,
    allocation: { [seoKey]: 50, [ppcKey]: 32, [socialKey]: 18 },
    deptAssignees: Object.fromEntries(
      Object.entries(memberByDept).map(([k, m]) => [k, String(m.key)]),
    ),
    servicesActive: [seoKey, ppcKey, socialKey],
    tags: ["test", "e-commerce", "vækst"],
    primaryContact: {
      name: "Maja Testesen",
      title: "Marketingchef",
      email: "maja@testkunde.example",
      phone: "+45 20 00 00 01",
      isPrimary: true,
      lastContactedAt: daysAgo(6),
    },
    secondaryContact: {
      name: "Peter Prøve",
      title: "CEO",
      email: "peter@testkunde.example",
      phone: "+45 20 00 00 02",
    },
    hoursBudget: 60,
    monthlyProfitMargin: 38,
    utilisationHistory: [78, 84, 91, 88, 95, 86],
    npsInterval: "quarterly",
    npsSendEnabled: false,
    npsRecipientKind: "primary",
    lastActivityLabel: "Testkunde — opdateret lige nu",
    leadSource: "anbefaling",
    googleDriveUrl: "https://drive.google.com/drive/folders/test",
    annualAdjustmentPct: 3,
    lastContactedAt: daysAgo(6),
    agreementType: "Løbende",
    marketingStartMrr: 8000,
    marketingUpsellMrr: 4000,
    infoMd:
      "<h3>Om testkunden</h3><p>Fiktiv e-commerce-kunde oprettet til test af hele CRM'et. Slå den til/fra under <strong>Indstillinger</strong>.</p><ul><li>Fokus: SEO + PPC + Paid Social</li><li>Kontakt: Maja (marketing)</li></ul>",
    apexIndeks: {
      indeks: 112,
      status: "ok",
      businessCategory: "E-commerce",
      headlineMetric: "Omsætning (YoY)",
      aggregation: "customer",
      partial: false,
      customerCount: 1,
      computedAt: daysAgo(1),
      fetchedAt: daysAgo(0),
      perChannel: { seo: 118, ppc: 105, social: 109 },
    },
  });

  // ── Kontakter ───────────────────────────────────────────────────────────
  const contacts = await Contact.create(
    [
      { name: "Maja Testesen", title: "Marketingchef", email: "maja@testkunde.example", phone: "+45 20 00 00 01", isPrimary: true, lastContactedAt: daysAgo(6) },
      { name: "Peter Prøve", title: "CEO", email: "peter@testkunde.example", phone: "+45 20 00 00 02", lastContactedAt: daysAgo(40) },
      { name: "Sofie Sandkasse", title: "Webudvikler", email: "sofie@testkunde.example", phone: "+45 20 00 00 03" },
    ].map((c) => ({ ...TEST, clientId: client._id, ...c })),
  );
  void contacts;

  // ── Kontrakter ──────────────────────────────────────────────────────────
  const signedAt = daysAgo(180);
  const hash = createHash("sha256").update(CONTRACT_BODY).digest("hex");
  const signedFields = (/** @type {Date} */ at) => ({
    signedAt: at,
    signedBy: "Maja Testesen",
    signedByName: "Maja Testesen",
    signedByEmail: "maja@testkunde.example",
    signedByTitle: "Marketingchef",
    signedByCompany: "Testkunde ApS",
    signatureIp: "203.0.113.7",
    signatureDocumentHash: hash,
    consentAcceptedAt: at,
  });
  await Contract.create([
    {
      ...TEST,
      ...signedFields(signedAt),
      key: `${TEST_CUSTOMER_SLUG}-retainer`,
      clientId: client._id,
      clientSlug: client.slug,
      type: "retainer",
      label: "Retainer — SEO & PPC",
      value: 16000,
      currency: "DKK",
      status: "active",
      startDate: signedAt,
      renewalDate: daysFromNow(60),
      noticeDays: 90,
      termsSummary: "Løbende SEO + PPC, 90 dages opsigelse.",
      documentBodyMd: CONTRACT_BODY,
      servicesActive: [seoKey, ppcKey],
      serviceLines: [
        { key: seoKey, name: "SEO", amount: 9000 },
        { key: ppcKey, name: "PPC", amount: 7000 },
      ],
      commercialAppliedAt: signedAt,
    },
    {
      ...TEST,
      key: `${TEST_CUSTOMER_SLUG}-tillaeg-social`,
      clientId: client._id,
      clientSlug: client.slug,
      type: "retainer",
      label: "Tillæg — Paid Social",
      value: 5000,
      currency: "DKK",
      status: "pending_signature",
      startDate: daysFromNow(7),
      noticeDays: 90,
      termsSummary: "Tillæg afventer underskrift — tæller ikke i MRR endnu.",
      documentBodyMd: "# Tillæg — Paid Social\n\nMånedligt vederlag: **5.000 kr**.\n",
      servicesActive: [socialKey],
      serviceLines: [{ key: socialKey, name: "Paid Social", amount: 5000 }],
    },
    {
      ...TEST,
      ...signedFields(daysAgo(400)),
      key: `${TEST_CUSTOMER_SLUG}-web-projekt`,
      clientId: client._id,
      clientSlug: client.slug,
      type: "project",
      label: "Projekt — Webshop relaunch",
      value: 45000,
      currency: "DKK",
      status: "ended",
      startDate: daysAgo(400),
      endDate: daysAgo(300),
      termsSummary: "Afsluttet engangsprojekt.",
      documentBodyMd: "# Projekt — Webshop relaunch\n\nEngangsbeløb: **45.000 kr**.\n",
    },
    {
      ...TEST,
      ...signedFields(daysAgo(12)),
      key: `${TEST_CUSTOMER_SLUG}-web-engang`,
      clientId: client._id,
      clientSlug: client.slug,
      type: "one_off",
      label: "Engangs — Landingpage",
      value: 20000,
      currency: "DKK",
      status: "active",
      startDate: daysAgo(12),
      termsSummary: "Engangs web (20.000 kr).",
      documentBodyMd: "# Engangs — Landingpage\n\nEngangsbeløb: **20.000 kr**.\n",
      serviceLines: [{ key: "oneoff-web", name: "Web (engangs)", amount: 20000 }],
      commercialAppliedAt: daysAgo(12),
    },
  ]);

  // ── Opsalg (alle tre typer) ─────────────────────────────────────────────
  await Upsell.create([
    {
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      type: "one_time",
      amount: 20000,
      periodFrom: ym,
      periodTo: ym,
      soldBy: String(member(0).name),
      soldByKey: String(member(0).key),
      soldAt: daysAgo(12),
      department: "web",
      description: "Web (engangs) via kontrakt «Engangs — Landingpage»",
      createdBy: "Testkunde",
    },
    {
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      type: "temporary_mrr",
      amount: 5000,
      periodFrom: ym,
      periodTo: nextYm,
      soldBy: String(member(1).name),
      soldByKey: String(member(1).key),
      soldAt: daysAgo(5),
      department: ppcKey,
      description: "Ekstra PPC-indsats i to måneder op til udsalg.",
      createdBy: "Testkunde",
    },
    {
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      type: "mrr_increase",
      amount: 4000,
      periodFrom: prevYm,
      periodTo: prevYm,
      soldBy: String(member(2).name),
      soldByKey: String(member(2).key),
      soldAt: daysAgo(70),
      department: ppcKey,
      description: "Løft i løbende PPC-budget (allerede lagt i retaineren).",
      createdBy: "Testkunde",
    },
  ]);

  // ── Opgaver ─────────────────────────────────────────────────────────────
  /** @type {{ key: string; title: string; hint?: string; dept: string; who: number; status: string; priority: string; due: Date; est: number; logged: number; billable?: boolean; done?: Date }[]} */
  const TASKS = [
    { key: "audit", title: "Teknisk SEO-audit", hint: "Crawl + Core Web Vitals", dept: seoKey, who: 0, status: "doing", priority: "high", due: daysAgo(1), est: 12, logged: 7.5 },
    { key: "kw", title: "Søgeordsanalyse Q-næste", dept: seoKey, who: 0, status: "todo", priority: "medium", due: daysFromNow(9), est: 6, logged: 0 },
    { key: "ppc-review", title: "PPC budget review (Search)", dept: ppcKey, who: 1, status: "review", priority: "high", due: daysFromNow(2), est: 5, logged: 4 },
    { key: "pmax", title: "Byg PMax feed", dept: ppcKey, who: 1, status: "todo", priority: "medium", due: daysAgo(4), est: 8, logged: 1 },
    { key: "social-creative", title: "Paid social — creatives v2", dept: socialKey, who: 2, status: "blocked", priority: "high", due: daysFromNow(4), est: 8, logged: 2 },
    { key: "content-brief", title: "Kvartals content brief", dept: contentKey, who: 3, status: "todo", priority: "low", due: daysFromNow(14), est: 4, logged: 0 },
    { key: "report", title: "Månedsrapport — forrige måned", dept: ppcKey, who: 0, status: "done", priority: "medium", due: daysAgo(8), est: 3, logged: 3.25, done: daysAgo(8) },
    { key: "kickoff", title: "Kick-off møde & mål", dept: seoKey, who: 1, status: "done", priority: "medium", due: daysAgo(30), est: 2, logged: 2, done: daysAgo(30) },
    { key: "internal", title: "Intern: opdater kundeprofil", dept: ppcKey, who: 1, status: "todo", priority: "low", due: daysFromNow(3), est: 1, logged: 0.5, billable: false },
    { key: "old", title: "Annulleret: A/B test (kunden pausede)", dept: socialKey, who: 2, status: "cancelled", priority: "low", due: daysAgo(20), est: 4, logged: 0.5 },
  ];
  /** @type {Record<string, import('mongoose').Document & { _id: unknown }>} */
  const taskByKey = {};
  for (const t of TASKS) {
    const m = member(t.who);
    taskByKey[t.key] = await Task.create({
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      clientCvr: "99999999",
      title: t.title,
      hint: t.hint,
      description: `<p>${t.title} — testopgave for Testkunde ApS.</p>`,
      departmentKey: t.dept,
      departmentId: deptDoc(t.dept)?._id,
      assigneeMemberKey: String(m.key),
      assigneeMemberKeys: [String(m.key)],
      assigneeId: m._id,
      createdByMemberKey: String(owner.key),
      createdByMemberId: owner._id,
      status: t.status,
      priority: t.priority,
      dueDate: t.due,
      estimateHours: t.est,
      loggedHours: t.logged,
      billable: t.billable !== false,
      completedAt: t.done,
    });
  }
  // Delopgaver
  for (const [i, title] of ["Crawl af shop", "Gennemgå Core Web Vitals", "Skriv anbefalinger"].entries()) {
    const m = member(0);
    await Task.create({
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      title,
      departmentKey: seoKey,
      departmentId: deptDoc(seoKey)?._id,
      assigneeMemberKey: String(m.key),
      assigneeMemberKeys: [String(m.key)],
      assigneeId: m._id,
      status: i === 0 ? "done" : i === 1 ? "doing" : "todo",
      priority: "medium",
      dueDate: daysFromNow(i),
      estimateHours: 3,
      isSubTask: true,
      parentTaskId: taskByKey.audit._id,
      completedAt: i === 0 ? daysAgo(3) : undefined,
    });
  }
  // Kommentarer
  for (const [i, text] of [
    "Crawl er kørt — 142 sider med manglende canonical.",
    "Husk at tage højde for sæsonen i budgettet.",
    "Kunden har godkendt creatives; afventer assets.",
  ].entries()) {
    const m = member(i);
    const task = [taskByKey.audit, taskByKey["ppc-review"], taskByKey["social-creative"]][i];
    await TaskComment.create({
      ...TEST,
      taskId: task._id,
      clientId: client._id,
      authorMemberKey: String(m.key),
      authorMemberId: m._id,
      bodyHtml: `<p>${text}</p>`,
      bodyText: text,
    });
  }

  // ── Tidsregistreringer (denne + forrige måned) ──────────────────────────
  const entries = [];
  const taskList = Object.values(taskByKey);
  for (let i = 0; i < 26; i += 1) {
    const t = TASKS[i % TASKS.length];
    const m = member(t.who);
    entries.push({
      ...TEST,
      memberKey: String(m.key),
      teamMemberId: m._id,
      clientId: client._id,
      clientSlug: client.slug,
      departmentKey: t.dept,
      departmentId: deptDoc(t.dept)?._id,
      taskId: taskList[i % taskList.length]._id,
      durationMinutes: [60, 90, 45, 120, 30, 150][i % 6],
      description: `${t.title} — arbejde`,
      workedAt: daysAgo(i * 2 + (i % 3), 9 + (i % 6)),
      billable: t.billable !== false,
      source: "manual",
    });
  }
  await TimeEntry.insertMany(entries);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthMinutes = entries
    .filter((e) => e.workedAt >= monthStart)
    .reduce((s, e) => s + e.durationMinutes, 0);
  await Client.updateOne(
    { _id: client._id },
    { $set: { hoursThisMonth: Math.round((thisMonthMinutes / 60) * 100) / 100 } },
  );

  // ── NPS og noter ────────────────────────────────────────────────────────
  await NpsResponse.create(
    [
      { score: 9, days: 20, comment: "Fantastisk samarbejde og tydelig rapportering." },
      { score: 8, days: 110, comment: "Godt, men vi vil gerne se mere proaktive forslag." },
      { score: 10, days: 200, comment: "" },
      { score: 7, days: 300, comment: "Svartider kunne være hurtigere." },
    ].map((r) => ({
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      contactEmail: "maja@testkunde.example",
      score: r.score,
      sentAt: daysAgo(r.days + 2),
      respondedAt: daysAgo(r.days),
      comment: r.comment || undefined,
    })),
  );

  await Note.create(
    [
      { type: "meeting", body: "Kvartalsmøde: aftalt fokus på ROAS og nye produktkategorier.", days: 14 },
      { type: "call", body: "Maja ringede om budget til udsalg — opsalg på midlertidig PPC.", days: 6 },
      { type: "alert", body: "Kunden nævnte at de overvejer at konkurrenceudsætte SEO ved årsskiftet.", days: 3 },
      { type: "note", body: "Faktureres den 1. i måneden. Kontakt til regnskab: regnskab@testkunde.example", days: 40 },
    ].map((n) => ({
      clientId: client._id,
      clientSlug: client.slug,
      authorMemberKey: String(owner.key),
      authorId: owner._id,
      type: n.type,
      body: n.body,
      occurredAt: daysAgo(n.days),
    })),
  );

  return { ok: true, status: await getTestCustomerStatus() };
}
