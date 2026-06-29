import { routes } from "./routes";

/**
 * Paths protected by auth middleware (same set as CRM shell destinations).
 */
export const WORKSPACE_ROUTE_PREFIXES = [
  routes.dashboard,
  routes.settings,
  routes.pulse,
  routes.clients,
  routes.contracts,
  routes.tasks,
  routes.templates,
  routes.time,
  routes.workload,
  routes.nps,
  routes.kb,
  routes.team,
  routes.users,
  routes.reports,
  routes.chat,
];

/**
 * @param {string} pathname
 */
export function isWorkspacePath(pathname) {
  return WORKSPACE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
