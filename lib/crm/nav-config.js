import { routes } from "@/config/routes";

/** Sidebar groups (Danish labels from prototype) */
export const CRM_NAV_GROUPS = [
  { id: "overblik", label: "Forretning" },
  { id: "arbejde", label: "Arbejde" },
  { id: "kunde", label: "Kunde" },
  { id: "organisation", label: "Organisation" },
];

/**
 * @typedef {object} CrmNavItem
 * @property {string} id
 * @property {string} label
 * @property {string} [href]
 * @property {'overblik' | 'arbejde' | 'kunde' | 'organisation'} group
 * @property {'clients'} [badge]
 * @property {boolean} [adminOnly] Only shown to admins (the page itself also redirects non-admins).
 * @property {boolean} [hidden] Not shown in the sidebar for anyone (page still reachable by URL).
 */

/** @type {CrmNavItem[]} */
export const CRM_NAV_ITEMS = [
  { id: "pulse", label: "Agency Pulse", href: routes.pulse, group: "overblik" },
  { id: "clients", label: "Kunder", href: routes.clients, group: "overblik", badge: "clients" },
  { id: "contracts", label: "Kontrakter", href: routes.contracts, group: "overblik" },
  { id: "tasks", label: "Opgaver", href: routes.tasks, group: "arbejde" },
  { id: "calendar", label: "Min kalender", href: routes.calendar, group: "arbejde" },
  { id: "templates", label: "Opgaveskabeloner", href: routes.templates, group: "arbejde", adminOnly: true },
  { id: "time", label: "Tidsregistrering", href: routes.time, group: "arbejde" },
  { id: "workload", label: "Belægning", href: routes.workload, group: "arbejde", adminOnly: true },
  { id: "nps", label: "NPS", href: routes.nps, group: "kunde" },
  { id: "tov", label: "Brand Core", href: routes.tov, group: "kunde" },
  { id: "kb", label: "Knowledge base", href: routes.kb, group: "organisation" },
  { id: "toolbox", label: "Toolbox", href: routes.toolbox, group: "organisation" },
  { id: "team", label: "Team", href: routes.team, group: "organisation", adminOnly: true },
  { id: "users", label: "Brugerstyring", href: routes.users, group: "organisation", adminOnly: true },
  { id: "reports", label: "Rapporter", href: routes.reports, group: "organisation", hidden: true },
];
