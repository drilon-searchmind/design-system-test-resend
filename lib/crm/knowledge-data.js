/**
 * Wiki sections — structure inspired by the agency knowledge base layout.
 * Content is created manually in Agency OS, not imported from external sources.
 * @typedef {{ id: string; name: string; short: string; description: string; deptHue: number; icon?: string }} KnowledgeSection
 */

/** @type {KnowledgeSection[]} */
export const KNOWLEDGE_SECTIONS = [
  {
    id: "clickup",
    name: "ClickUp",
    short: "CU",
    description: "Statuses, budget, commandments",
    deptHue: 260,
    icon: "📋",
  },
  {
    id: "onboarding",
    name: "Onboarding",
    short: "ONB",
    description: "Nye kunder og medarbejdere",
    deptHue: 272,
    icon: "🚀",
  },
  {
    id: "essentials",
    name: "Det essentielle",
    short: "ESS",
    description: "Politikker og vilkår",
    deptHue: 155,
    icon: "📘",
  },
  {
    id: "practical",
    name: "Det praktiske",
    short: "PRA",
    description: "NPS, Zenegy, lokaler m.m.",
    deptHue: 75,
    icon: "🛠",
  },
  {
    id: "procedures",
    name: "Procedurer",
    short: "SOP",
    description: "Interne workflows",
    deptHue: 25,
    icon: "🎯",
  },
  {
    id: "tech",
    name: "Tech & AI",
    short: "TEC",
    description: "Stack, automation, Uniqkey",
    deptHue: 210,
    icon: "💻",
  },
  {
    id: "sharing",
    name: "Vidensdeling",
    short: "VID",
    description: "Workshops og learnings",
    deptHue: 290,
    icon: "💡",
  },
  {
    id: "leadership",
    name: "Ledelse",
    short: "LED",
    description: "Lederhåndbog og feedback",
    deptHue: 320,
    icon: "📗",
  },
  {
    id: "commercial",
    name: "Kommercielt",
    short: "COM",
    description: "Partner og referral",
    deptHue: 45,
    icon: "🤝",
  },
  {
    id: "production",
    name: "Produktion",
    short: "PRO",
    description: "Creative & content",
    deptHue: 180,
    icon: "🎨",
  },
];

/** @deprecated Use KNOWLEDGE_SECTIONS */
export const KNOWLEDGE_CATEGORIES = KNOWLEDGE_SECTIONS;

/** Static mock articles removed — wiki reads from database. */
export const KNOWLEDGE_ARTICLES = [];

/**
 * @param {string} sectionId
 */
export function getKnowledgeSectionById(sectionId) {
  return KNOWLEDGE_SECTIONS.find((s) => s.id === sectionId) ?? null;
}

/** @deprecated */
export const getKnowledgeCategoryById = getKnowledgeSectionById;
