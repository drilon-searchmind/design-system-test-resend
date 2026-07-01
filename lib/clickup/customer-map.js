import { customFieldsByName, fieldValue } from "@/lib/clickup/custom-fields";

/** ClickUp Account Dashboard field names (with emoji prefixes as in workspace). */
const CU = {
  clientLead: "⭐️ Client Lead",
  budgetMonth: "⭐️ Budget Month",
  clientDropdown: "⭐ ️ Client",
  cvr: "⭐ CVR",
  companyName: "⭐ Virksomhedsnavn",
  status: "🤝 Status",
  startDate: "🤝 Startdato",
  endDate: "🤝 Slutdato",
  terminationDate: "🤝 Opsigelsesdato",
  churnReason: "🤝 Opsigelsesgrund",
  churnNote: "🤝 Opsigelsesgrund - Uddybning",
  services: "🤝 Service(s)",
  companyType: "🤝 Virksomhedstype",
  agreementType: "🤝 Aftale type",
  leadSource: "🤝Lead Source",
  lifetimeMonths: "🤝 Levetid (Mdr)",
  seller: "🤝 Sælger",
  customerNotes: "🤝 Kundenoter",
  cpAssignee: "🤝 1.CP - Ansvarlig",
  seoAssignee: "🤝 2.SEO - Ansvarlig",
  ppcAssignee: "🤝 3.PPC - Ansvarlig",
  ppcSupport: "🤝 PPC - Support",
  psAssignee: "🤝 4.PS - Ansvarlig",
  psSupport: "🤝 PS - Support",
  contentAssignee: "🤝 5.Content - Ansvarlig",
  copywriter: "🤝 5.Copywriter",
  creativeAssignee: "🤝 6.Creative - Ansvarlig",
  emailAssignee: "🤝 7.EM - Ansvarlig",
  martechAssignee: "🤝 8. MarTech - Ansvarlig",
  webAssignee: "🤝 9. Web - Ansvarlig",
  googleDrive: "🗃 Google Drive",
  marketingMrr: "💰 Marketing - MRR",
  marketingStartMrr: "💰 Marketing - Start MRR",
  marketingUpsellMrr: "💰 Marketing - Opsalg MRR",
  marketingSetupFee: "💰 Marketing - Opstartspris",
  priceAdjustment: "💰 Prisregulering (3%)",
  webMrr: "💰 Web - MRR",
  webOneOff: "💰 Web - Engangspris",
  webUpsell: "💰 Web - Opsalg",
  webArrStart: "💰 Web - ARR Opstartsdato",
  clv: "💰 CLV",
  subscriptionAhle: "📃 Abonnement (AHLE)",
  subscriptionWebAhle: "📃 Abonnement Web (AHLE)",
  contacts: "👥 Kontaktperson",
  contract: "📝 Kontrakt",
  domains: "🌐 Sproglag & Domæner",
};

/** @type {Record<string, string>} */
const SERVICE_TO_DEPT = {
  SEO: "seo",
  PPC: "ppc",
  PS: "social",
  EM: "email",
  Content: "content",
  Creative: "creative",
  MarTech: "martech",
  CRO: "cro",
  "Linkbuilding": "seo",
  Affiliate: "ppc",
};

/** @type {Record<string, string>} */
const LEAD_SOURCE_MAP = {
  Canvas: "andet",
  Referrals: "referal",
  Referral: "referal",
  Henvisning: "referal",
  Outbound: "outbound",
  Inbound: "inbound",
  Event: "event",
  Partner: "partner",
};

/** @type {Record<string, "active" | "paused" | "inactive">} */
const STATUS_MAP = {
  Aktiv: "active",
  Active: "active",
  Pauseret: "paused",
  Paused: "paused",
  Pause: "paused",
  Inaktiv: "inactive",
  Inactive: "inactive",
  Opsagt: "inactive",
  Churned: "inactive",
};

/**
 * @param {string} raw
 */
function slugifyClient(raw) {
  const base = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base ? `c-${base}` : "c-unknown";
}

/**
 * @param {string} label
 */
function mapServicesToDeptKeys(label) {
  if (!label.trim()) return "";
  return label
    .split(";")
    .map((part) => part.trim())
    .map((part) => SERVICE_TO_DEPT[part] ?? part.toLowerCase().replace(/\s+/g, ""))
    .filter(Boolean)
    .join("; ");
}

/**
 * Map a ClickUp Account Dashboard task → Agency OS Client CSV row.
 * @param {Record<string, unknown>} task
 */
export function mapClickUpCustomerTask(task) {
  const byName = customFieldsByName(
    /** @type {Record<string, unknown>[]} */ (task.custom_fields ?? []),
  );

  const clickUpId = String(task.id ?? "");
  const taskTitle = String(task.name ?? "").trim();
  const companyName = fieldValue(byName, CU.companyName) || taskTitle;
  const statusRaw = fieldValue(byName, CU.status);
  const status = STATUS_MAP[statusRaw] ?? (statusRaw ? statusRaw.toLowerCase() : "");
  const leadSourceRaw = fieldValue(byName, CU.leadSource);
  const leadSource = LEAD_SOURCE_MAP[leadSourceRaw] ?? leadSourceRaw.toLowerCase();
  const servicesRaw = fieldValue(byName, CU.services);
  const servicesActive = mapServicesToDeptKeys(servicesRaw);

  const slugSource =
    taskTitle.includes(".") && !taskTitle.includes(" ") ? taskTitle.replace(/\./g, "-") : companyName;

  /** @type {Record<string, string>} */
  const row = {
    customerClickUpId: clickUpId,
    clickUpTaskName: taskTitle,
    clickUpUrl: String(task.url ?? ""),
    name: companyName,
    slug: slugifyClient(slugSource),
    cvr: fieldValue(byName, CU.cvr),
    status,
    statusRaw,
    startedAt: fieldValue(byName, CU.startDate),
    renewalAt: fieldValue(byName, CU.endDate),
    terminatedAt: fieldValue(byName, CU.terminationDate),
    churnReason: fieldValue(byName, CU.churnReason),
    churnNote: fieldValue(byName, CU.churnNote),
    servicesActive,
    servicesActiveRaw: servicesRaw,
    industry: fieldValue(byName, CU.companyType),
    leadSource,
    leadSourceRaw,
    googleDriveUrl: fieldValue(byName, CU.googleDrive),
    retainerAmount: fieldValue(byName, CU.marketingMrr) || fieldValue(byName, CU.marketingStartMrr),
    marketingStartMrr: fieldValue(byName, CU.marketingStartMrr),
    marketingUpsellMrr: fieldValue(byName, CU.marketingUpsellMrr),
    marketingSetupFee: fieldValue(byName, CU.marketingSetupFee),
    annualAdjustmentPct: fieldValue(byName, CU.priceAdjustment),
    webMrr: fieldValue(byName, CU.webMrr),
    webOneOffPrice: fieldValue(byName, CU.webOneOff),
    webUpsell: fieldValue(byName, CU.webUpsell),
    webArrStartedAt: fieldValue(byName, CU.webArrStart),
    clv: fieldValue(byName, CU.clv),
    lifetimeMonths: fieldValue(byName, CU.lifetimeMonths),
    agreementType: fieldValue(byName, CU.agreementType),
    subscriptionAhle: fieldValue(byName, CU.subscriptionAhle),
    subscriptionWebAhle: fieldValue(byName, CU.subscriptionWebAhle),
    ownerMemberKey: fieldValue(byName, CU.clientLead) || fieldValue(byName, CU.cpAssignee),
    seller: fieldValue(byName, CU.seller),
    customerNotes: fieldValue(byName, CU.customerNotes),
    "deptAssignees.clientMgmt": fieldValue(byName, CU.cpAssignee),
    "deptAssignees.seo": fieldValue(byName, CU.seoAssignee),
    "deptAssignees.ppc": fieldValue(byName, CU.ppcAssignee),
    "deptAssignees.social": fieldValue(byName, CU.psAssignee),
    "deptAssignees.content": fieldValue(byName, CU.contentAssignee),
    "deptAssignees.creative": fieldValue(byName, CU.creativeAssignee),
    "deptAssignees.email": fieldValue(byName, CU.emailAssignee),
    "deptAssignees.martech": fieldValue(byName, CU.martechAssignee),
    "deptAssignees.web": fieldValue(byName, CU.webAssignee),
    ppcSupport: fieldValue(byName, CU.ppcSupport),
    psSupport: fieldValue(byName, CU.psSupport),
    copywriter: fieldValue(byName, CU.copywriter),
    clickUpContacts: fieldValue(byName, CU.contacts),
    clickUpContractTasks: fieldValue(byName, CU.contract),
    clickUpDomains: fieldValue(byName, CU.domains),
    clickUpClientDropdown: fieldValue(byName, CU.clientDropdown),
    clickUpBudgetMonth: fieldValue(byName, CU.budgetMonth),
  };

  return row;
}

/** Column order for export CSV (Agency OS Client mapping first). */
export const CUSTOMER_CSV_COLUMNS = [
  "customerClickUpId",
  "clickUpTaskName",
  "clickUpUrl",
  "name",
  "slug",
  "cvr",
  "status",
  "statusRaw",
  "startedAt",
  "renewalAt",
  "terminatedAt",
  "churnReason",
  "churnNote",
  "servicesActive",
  "servicesActiveRaw",
  "industry",
  "leadSource",
  "leadSourceRaw",
  "googleDriveUrl",
  "retainerAmount",
  "marketingStartMrr",
  "marketingUpsellMrr",
  "marketingSetupFee",
  "annualAdjustmentPct",
  "webMrr",
  "webOneOffPrice",
  "webUpsell",
  "webArrStartedAt",
  "clv",
  "lifetimeMonths",
  "agreementType",
  "subscriptionAhle",
  "subscriptionWebAhle",
  "ownerMemberKey",
  "seller",
  "customerNotes",
  "deptAssignees.clientMgmt",
  "deptAssignees.seo",
  "deptAssignees.ppc",
  "deptAssignees.social",
  "deptAssignees.content",
  "deptAssignees.creative",
  "deptAssignees.email",
  "deptAssignees.martech",
  "deptAssignees.web",
  "ppcSupport",
  "psSupport",
  "copywriter",
  "clickUpContacts",
  "clickUpContractTasks",
  "clickUpDomains",
  "clickUpClientDropdown",
  "clickUpBudgetMonth",
];
