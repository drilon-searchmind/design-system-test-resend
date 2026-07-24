import { routes } from "@/config/routes";

import { getTeamMemberById } from "./team-utils";
import { getAgencyUserById } from "./users-utils";
import { CLIENTS, CONTRACTS, TASKS } from "./static-data";
const ENTRIES = [
  [routes.pulse, "Agency Pulse"],
  [routes.clients, "Kunder"],
  [routes.contracts, "Kontrakter"],
  [routes.tasks, "Opgaver"],
  [routes.calendar, "Min kalender"],
  [routes.templates, "Opgaveskabeloner"],
  [routes.time, "Tidsregistrering"],
  [routes.workload, "Belægning"],
  [routes.nps, "NPS"],
  [routes.kb, "Knowledge base"],
  [routes.team, "Team"],
  [routes.users, "Brugerstyring"],
  [routes.reports, "Rapporter"],
  [routes.chat, "AI Chat"],
  [routes.settings, "Indstillinger"],
  [routes.dashboard, "Oversigt"],
];

/**
 * Title shown in CRM top bar for a pathname.
 * @param {string} pathname
 */
export function getWorkspaceTitle(pathname) {
  const clientMatch = pathname.match(/^\/clients\/([^/]+)/);
  if (clientMatch) {
    const c = CLIENTS.find((x) => x.id === clientMatch[1]);
    return c ? c.name : "Kunde";
  }

  const contractMatch = pathname.match(/^\/contracts\/([^/]+)/);
  if (contractMatch) {
    const ctr = CONTRACTS.find((x) => x.id === contractMatch[1]);
    return ctr ? `${ctr.clientName} · Aftale` : "Kontrakt";
  }

  const taskMatch = pathname.match(/^\/tasks\/([^/]+)(?:\/([^/]+))?/);
  if (taskMatch) {
    const subId = taskMatch[2];
    const lookupId = subId || taskMatch[1];
    const tsk = TASKS.find((x) => x.id === lookupId);
    if (tsk) return subId ? `${tsk.title} · Delopgave` : `${tsk.title} · Opgave`;
    return subId ? "Delopgave" : "Opgave";
  }

  const kbMatch = pathname.match(/^\/kb\/([^/]+)/);
  if (kbMatch) {
    return "Wiki-artikel";
  }

  const teamMemberMatch = pathname.match(/^\/team\/([^/]+)/);
  if (teamMemberMatch) {
    const member = getTeamMemberById(teamMemberMatch[1]);
    if (member) return `${member.name} · Bruger`;
    return "Bruger";
  }

  const userAccountMatch = pathname.match(/^\/users\/([^/]+)/);
  if (userAccountMatch) {
    const acct = getAgencyUserById(userAccountMatch[1]);
    if (acct) return `${acct.name} · Bruger`;
    return "Konto";
  }

  const workloadMemberMatch = pathname.match(/^\/workload\/([^/]+)/);
  if (workloadMemberMatch) {
    const member = getTeamMemberById(decodeURIComponent(workloadMemberMatch[1]));
    if (member) return `${member.name} · Belægning`;
    return "Medarbejder";
  }

  for (const [prefix, title] of ENTRIES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  return "Agency OS";
}
