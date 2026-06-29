import { routes } from "@/config/routes";

import { getKnowledgeArticleBySlug } from "./knowledge-utils";
import { getTeamMemberById } from "./team-utils";
import { getAgencyUserById } from "./users-utils";
import { CLIENTS, CONTRACTS, TASKS } from "./static-data";

const ENTRIES = [
  [routes.pulse, "Agency Pulse"],
  [routes.clients, "Kunder"],
  [routes.contracts, "Kontrakter"],
  [routes.tasks, "Opgaver"],
  [routes.templates, "Task templates"],
  [routes.time, "Tidsregistrering"],
  [routes.workload, "Workload"],
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

  const taskMatch = pathname.match(/^\/tasks\/([^/]+)/);
  if (taskMatch) {
    const tsk = TASKS.find((x) => x.id === taskMatch[1]);
    return tsk ? `${tsk.title} · Opgave` : "Opgave";
  }

  const kbMatch = pathname.match(/^\/kb\/([^/]+)/);
  if (kbMatch) {
    const art = getKnowledgeArticleBySlug(kbMatch[1]);
    if (art) return `${art.title} · Wiki`;
    return "Wiki-artikel";
  }

  const teamMemberMatch = pathname.match(/^\/team\/([^/]+)/);
  if (teamMemberMatch) {
    const member = getTeamMemberById(teamMemberMatch[1]);
    if (member) return `${member.name} · Team`;
    return "Profil";
  }

  const userAccountMatch = pathname.match(/^\/users\/([^/]+)/);
  if (userAccountMatch) {
    const acct = getAgencyUserById(userAccountMatch[1]);
    if (acct) return `${acct.name} · Bruger`;
    return "Konto";
  }

  for (const [prefix, title] of ENTRIES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  return "Agency OS";
}
