import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import Contract from "@/lib/db/models/contract";
import Department from "@/lib/db/models/department";
import KnowledgeArticle from "@/lib/db/models/knowledge-article";
import NpsCampaign from "@/lib/db/models/nps-campaign";
import NpsTemplate from "@/lib/db/models/nps-template";
import Task from "@/lib/db/models/task";
import TaskTemplate from "@/lib/db/models/task-template";
import TeamMember from "@/lib/db/models/team-member";
import { TEST_DATA_IDS } from "@/lib/crm/test-data-ids";
import { connectDb } from "@/lib/db/mongoose";

const TEST = { isTest: true };

/** Slet eksisterende test-rækker (børn først). */
export async function clearTestData() {
  await connectDb();
  await Task.deleteMany({ isTest: true });
  await NpsCampaign.deleteMany({ isTest: true });
  await Contact.deleteMany({ isTest: true });
  await Contract.deleteMany({ isTest: true });
  await TeamMember.deleteMany({ isTest: true });
  await TaskTemplate.deleteMany({ isTest: true });
  await KnowledgeArticle.deleteMany({ isTest: true });
  await NpsTemplate.deleteMany({ isTest: true });
  await Client.deleteMany({ isTest: true });
  await Department.deleteMany({ isTest: true });
}

/** @param {number} days */
function daysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/** @param {number} days */
function daysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/**
 * Opret ét relateret test-sæt (discipliner → kunde → team → opgaver …).
 * @param {{ replace?: boolean }} [opts]
 */
export async function seedTestData(opts = {}) {
  const { replace = true } = opts;
  await connectDb();

  if (replace) {
    await clearTestData();
  }

  /** @type {{ key: string; name: string; shortLabel: string; capacityHours: number; colorToken: string }[]} */
  const DEPT_SEEDS = [
    { key: "seo", name: "SEO", shortLabel: "SEO", capacityHours: 640, colorToken: "dep-seo" },
    { key: "ppc", name: "PPC", shortLabel: "PPC", capacityHours: 580, colorToken: "dep-ppc" },
    { key: "social", name: "Paid Social", shortLabel: "PS", capacityHours: 380, colorToken: "dep-social" },
    { key: "email", name: "E-mail", shortLabel: "EM", capacityHours: 260, colorToken: "dep-email" },
    { key: "geo", name: "GEO", shortLabel: "GEO", capacityHours: 160, colorToken: "dep-geo" },
    { key: "creative", name: "Creative", shortLabel: "CR", capacityHours: 200, colorToken: "dep-creative" },
    { key: "content", name: "Content", shortLabel: "CN", capacityHours: 180, colorToken: "dep-content" },
  ];

  /** @type {Record<string, import('mongoose').Document>} */
  const depByKey = {};
  for (let i = 0; i < DEPT_SEEDS.length; i += 1) {
    const s = DEPT_SEEDS[i];
    depByKey[s.key] = await Department.create({
      ...TEST,
      key: s.key,
      name: s.name,
      shortLabel: s.shortLabel,
      capacityHours: s.capacityHours,
      colorToken: s.colorToken,
    });
  }

  const primaryDept = depByKey[TEST_DATA_IDS.departmentKey];
  if (!primaryDept) throw new Error("Primary department seed missing");

  /** @type {{ key: string; name: string; roleTitle: string; deptKey: string; avatarInitials: string; hue: number; weeklyHours: number }[]} */
  const MEMBER_SEEDS = [
    { key: "lm", name: "Louise Madsen", roleTitle: "Account Director", deptKey: "ppc", avatarInitials: "LM", hue: 300, weeklyHours: 37 },
    { key: "mk", name: "Mikkel Kragh", roleTitle: "Head of PPC", deptKey: "ppc", avatarInitials: "MK", hue: 272, weeklyHours: 37 },
    { key: "as", name: "Astrid Sørensen", roleTitle: "SEO Lead", deptKey: "seo", avatarInitials: "AS", hue: 255, weeklyHours: 37 },
    { key: "ol", name: "Oliver Lange", roleTitle: "SEO Specialist", deptKey: "seo", avatarInitials: "OL", hue: 250, weeklyHours: 37 },
    { key: "ns", name: "Nikolaj Steen", roleTitle: "PPC Specialist", deptKey: "ppc", avatarInitials: "NS", hue: 275, weeklyHours: 37 },
    { key: "jl", name: "Jonas Lindberg", roleTitle: "Paid Social", deptKey: "social", avatarInitials: "JL", hue: 30, weeklyHours: 37 },
    { key: "es", name: "Emma Strøm", roleTitle: "Content Strategist", deptKey: "content", avatarInitials: "ES", hue: 85, weeklyHours: 37 },
    { key: "rn", name: "Rasmus Nielsen", roleTitle: "Creative Director", deptKey: "creative", avatarInitials: "RN", hue: 355, weeklyHours: 37 },
    { key: "kh", name: "Kristina Holm", roleTitle: "E-mail Specialist", deptKey: "email", avatarInitials: "KH", hue: 180, weeklyHours: 37 },
    { key: "tp", name: "Tobias Peterson", roleTitle: "GEO Specialist", deptKey: "geo", avatarInitials: "TP", hue: 135, weeklyHours: 37 },
  ];

  /** @type {Record<string, import('mongoose').Document>} */
  const memberByKey = {};
  for (let mi = 0; mi < MEMBER_SEEDS.length; mi += 1) {
    const m = MEMBER_SEEDS[mi];
    const dep = depByKey[m.deptKey];
    if (!dep) throw new Error(`Unknown dept ${m.deptKey}`);
    memberByKey[m.key] = await TeamMember.create({
      ...TEST,
      key: m.key,
      name: m.name,
      roleTitle: m.roleTitle,
      departmentId: dep._id,
      departmentKey: dep.key,
      avatarInitials: m.avatarInitials,
      hue: m.hue,
      weeklyHours: m.weeklyHours,
      active: true,
    });
  }

  const louise = memberByKey[TEST_DATA_IDS.teamMemberKey];
  if (!louise) throw new Error("Louise / lm team member missing");

  const client = await Client.create({
    ...TEST,
    slug: TEST_DATA_IDS.clientSlug,
    name: "Test Kunde ApS",
    industry: "Test / placeholder",
    logoInitials: "TK",
    hue: 220,
    currency: "DKK",
    retainerAmount: 25000,
    hoursBudget: 40,
    hoursThisMonth: 0,
    status: "active",
    health: "ok",
    npsInterval: "quarterly",
    servicesActive: ["seo", "ppc"],
    tags: ["test", "placeholder"],
  });

  await Client.findByIdAndUpdate(client._id, {
    ownerMemberKey: louise.key,
    ownerId: louise._id,
  });

  const contact = await Contact.create({
    ...TEST,
    clientId: client._id,
    name: "Test Kontakt",
    title: "Test kontaktperson",
    email: TEST_DATA_IDS.contactEmail,
    phone: "+45 12 34 56 78",
    isPrimary: true,
  });

  await Client.findByIdAndUpdate(client._id, {
    primaryContact: {
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
    },
  });

  const contract = await Contract.create({
    ...TEST,
    key: TEST_DATA_IDS.contractKey,
    clientId: client._id,
    clientSlug: client.slug,
    type: "retainer",
    label: "Test retainer",
    value: 25000,
    currency: "DKK",
    status: "active",
    startDate: new Date(),
    termsSummary: "Testkontrakt — placeholder.",
  });

  const taskTemplate = await TaskTemplate.create({
    ...TEST,
    key: TEST_DATA_IDS.taskTemplateKey,
    title: "Test opgaveskabelon",
    description: "Skabelon til testopgaver.",
    departmentId: primaryDept._id,
    departmentKey: primaryDept.key,
    defaultPriority: "medium",
    suggestedHours: 4,
    defaultDueOffsetDays: 7,
    scope: "retainer",
    checklist: ["Test trin 1", "Test trin 2"],
    active: true,
  });

  await TaskTemplate.create({
    ...TEST,
    key: "tpl-crm-verification",
    title: "CRM verifikation — sample skabelon",
    description:
      "Ekstra test-skabelon til manuel gennemgang af Task templates-siderne (liste, detalje, modal).",
    departmentId: primaryDept._id,
    departmentKey: primaryDept.key,
    defaultPriority: "high",
    suggestedHours: 2,
    defaultDueOffsetDays: 5,
    scope: "any",
    checklist: ["Gennemgå krav", "Opret opgave fra skabelon", "Validér felter i UI"],
    active: true,
  });

  /** @type {{ key: string; title: string; hint: string; deptKey: string; assigneeKey: string; status: string; priority: string; dueDate: Date; estimateHours: number }[]} */
  const TASK_SEEDS = [
    {
      key: TEST_DATA_IDS.taskKey,
      title: "Test opgave",
      hint: "Anchor-opgave til E2E.",
      deptKey: "seo",
      assigneeKey: "as",
      status: "todo",
      priority: "medium",
      dueDate: daysFromNow(5),
      estimateHours: 4,
    },
    {
      key: "task-seo-audit",
      title: "Teknisk SEO-audit — landing pages",
      hint: "Crawl + Core Web Vitals noter.",
      deptKey: "seo",
      assigneeKey: "ol",
      status: "doing",
      priority: "high",
      dueDate: daysAgo(1),
      estimateHours: 12,
    },
    {
      key: "task-ppc-review",
      title: "PPC budget review (Search)",
      hint: "Match Search terms mod intent.",
      deptKey: "ppc",
      assigneeKey: "mk",
      status: "todo",
      priority: "high",
      dueDate: daysAgo(3),
      estimateHours: 6,
    },
    {
      key: "task-ppc-build",
      title: "Byg PMax supplemental feed",
      deptKey: "ppc",
      assigneeKey: "ns",
      status: "review",
      priority: "medium",
      dueDate: daysFromNow(2),
      estimateHours: 5,
    },
    {
      key: "task-social-creative",
      title: "Paid social — creatives v2",
      deptKey: "social",
      assigneeKey: "jl",
      status: "todo",
      priority: "high",
      dueDate: daysAgo(5),
      estimateHours: 8,
    },
    {
      key: "task-content-brief",
      title: "Kvartals content brief",
      deptKey: "content",
      assigneeKey: "es",
      status: "todo",
      priority: "medium",
      dueDate: daysFromNow(10),
      estimateHours: 6,
    },
    {
      key: "task-creative-review",
      title: "Display pakke — review",
      deptKey: "creative",
      assigneeKey: "rn",
      status: "blocked",
      priority: "medium",
      dueDate: daysFromNow(14),
      estimateHours: 3,
    },
    {
      key: "task-email-flow",
      title: "Automation flow — velkomst",
      deptKey: "email",
      assigneeKey: "kh",
      status: "todo",
      priority: "low",
      dueDate: daysFromNow(7),
      estimateHours: 4,
    },
    {
      key: "task-geo-grid",
      title: "GEO prompts — lokationsgrid",
      deptKey: "geo",
      assigneeKey: "tp",
      status: "todo",
      priority: "medium",
      dueDate: daysAgo(2),
      estimateHours: 5,
    },
    {
      key: "task-lm-followup",
      title: "Kundestatus — opfølgning",
      deptKey: "ppc",
      assigneeKey: "lm",
      status: "todo",
      priority: "high",
      dueDate: daysFromNow(1),
      estimateHours: 2,
    },
  ];

  for (let ti = 0; ti < TASK_SEEDS.length; ti += 1) {
    const ts = TASK_SEEDS[ti];
    const dep = depByKey[ts.deptKey];
    const mem = memberByKey[ts.assigneeKey];
    if (!dep || !mem) throw new Error(`Task seed: missing dep or member for ${ts.key}`);
    await Task.create({
      ...TEST,
      clientId: client._id,
      clientSlug: client.slug,
      title: ts.title,
      hint: ts.hint,
      departmentId: dep._id,
      departmentKey: dep.key,
      assigneeMemberKey: mem.key,
      assigneeId: mem._id,
      status: ts.status,
      priority: ts.priority,
      dueDate: ts.dueDate,
      estimateHours: ts.estimateHours,
      ...(ti === 0 ? { templateId: taskTemplate._id } : {}),
    });
  }

  const kbArticle = await KnowledgeArticle.create({
    ...TEST,
    slug: TEST_DATA_IDS.kbSlug,
    title: "Test artikel",
    summary: "Placeholder-artikel i knowledge base.",
    bodyMd: "## Test\n\nDette er **test**-indhold.",
    tags: ["test", "onboarding"],
    audience: "internal",
    authorMemberKey: TEST_DATA_IDS.teamMemberKey,
    readingMinutes: 3,
    featured: false,
    published: true,
  });

  const npsTemplate = await NpsTemplate.create({
    ...TEST,
    key: TEST_DATA_IDS.npsTemplateKey,
    name: "Test NPS-skabelon",
    subject: "Test — hvordan går det?",
    bodyMd: "Hej {{name}},\n\nDette er en **test**-NPS-udsendelse.\n\nMvh Test",
    locale: "da",
    active: true,
  });

  const npsCampaign = await NpsCampaign.create({
    ...TEST,
    name: "Test NPS-kampagne",
    templateId: npsTemplate._id,
    status: "draft",
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    clientIds: [client._id],
  });

  return {
    ok: true,
    created: {
      departments: Object.keys(depByKey),
      teamMembers: Object.keys(memberByKey),
      primaryDepartment: primaryDept._id.toString(),
      client: client._id.toString(),
      teamMemberLouise: louise._id.toString(),
      contact: contact._id.toString(),
      contract: contract._id.toString(),
      taskTemplate: taskTemplate._id.toString(),
      taskCount: TASK_SEEDS.length,
      knowledgeArticle: kbArticle._id.toString(),
      npsTemplate: npsTemplate._id.toString(),
      npsCampaign: npsCampaign._id.toString(),
    },
  };
}
