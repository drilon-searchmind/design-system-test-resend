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
 */

/** @type {CrmNavItem[]} */
export const CRM_NAV_ITEMS = [
  { id: "pulse", label: "Agency Pulse", href: routes.pulse, group: "overblik" },
  { id: "clients", label: "Kunder", href: routes.clients, group: "overblik", badge: "clients" },
  { id: "contracts", label: "Kontrakter", href: routes.contracts, group: "overblik" },
  { id: "tasks", label: "Opgaver", href: routes.tasks, group: "arbejde" },
  { id: "templates", label: "Task templates", href: routes.templates, group: "arbejde" },
  { id: "time", label: "Tidsregistrering", href: routes.time, group: "arbejde" },
  { id: "workload", label: "Workload", href: routes.workload, group: "arbejde" },
  { id: "nps", label: "NPS", href: routes.nps, group: "kunde" },
  { id: "kb", label: "Knowledge base", href: routes.kb, group: "organisation" },
  { id: "team", label: "Team", href: routes.team, group: "organisation" },
  { id: "users", label: "Brugerstyring", href: routes.users, group: "organisation" },
  { id: "reports", label: "Rapporter", href: routes.reports, group: "organisation" },
];
