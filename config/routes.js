/**
 * Canonical paths — use instead of magic strings across app, middleware, redirects.
 */

export const routes = {
  home: "/",
  login: "/login",
  signUp: "/sign-up",
  dashboard: "/dashboard",
  /** Primary authenticated workspace home (Agency Pulse) */
  pulse: "/pulse",
  settings: "/settings",
  clients: "/clients",
  contracts: "/contracts",
  tasks: "/tasks",
  templates: "/templates",
  time: "/time",
  workload: "/workload",
  nps: "/nps",
  kb: "/kb",
  team: "/team",
  users: "/users",
  reports: "/reports",
  chat: "/chat",
  /** Scripted AI Chat demo (Slack-like) reached from the AI Chat one-pager */
  chatDemo: "/chat/demo",
  privacy: "/privacy",
  terms: "/terms",
  api: {
    health: "/api/health",
    stripeWebhook: "/api/webhooks/stripe",
    cron: "/api/cron",
  },
};

/**
 * @param {string} memberKey TeamMember.key / demo TEAM.id
 */
export function workloadMemberHref(memberKey) {
  const k = String(memberKey ?? "").trim();
  if (!k) return routes.workload;
  return `${routes.workload}/${encodeURIComponent(k)}`;
}

/**
 * @param {string} userAccountId `u-{mongoId}` or raw mongo hex
 */
export function userAccountHref(userAccountId) {
  const raw = String(userAccountId ?? "").trim();
  if (!raw) return routes.users;
  if (raw.startsWith("u-")) return `${routes.users}/${raw}`;
  return `${routes.users}/u-${raw}`;
}

/**
 * @param {{ userAccountId?: string | null; id?: string }} member
 */
export function memberProfileHref(member) {
  if (member?.userAccountId) return userAccountHref(member.userAccountId);
  if (member?.id) return userAccountHref(member.id);
  return routes.users;
}

