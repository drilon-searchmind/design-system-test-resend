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
  kbNew: "/kb/new",
  team: "/team",
  users: "/users",
  notifications: "/notifications",
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
 * @param {string} slug
 */
export function kbArticleHref(slug) {
  return `${routes.kb}/${encodeURIComponent(String(slug ?? "").trim())}`;
}

/**
 * @param {string} slug
 */
export function kbArticleEditHref(slug) {
  return `${kbArticleHref(slug)}/edit`;
}

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

/**
 * Canonical href for a task wire row or id string.
 * Delopgaver bruger `/tasks/{parentId}/{subTaskId}`.
 * @param {string | { id: string; isSubTask?: boolean; parentTaskId?: string }} task
 */
export function taskHref(task) {
  if (typeof task === "string") {
    const id = String(task ?? "").trim();
    return id ? `${routes.tasks}/${encodeURIComponent(id)}` : routes.tasks;
  }
  const id = String(task?.id ?? "").trim();
  if (!id) return routes.tasks;
  const parentId = String(task?.parentTaskId ?? "").trim();
  if (task?.isSubTask && parentId) {
    return `${routes.tasks}/${encodeURIComponent(parentId)}/${encodeURIComponent(id)}`;
  }
  return `${routes.tasks}/${encodeURIComponent(id)}`;
}

