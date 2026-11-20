import { ADMIN_RESOURCE_IDS } from "@/lib/crm/admin-resource-meta";

/**
 * Every CRM API endpoint exposed as an MCP tool.
 * Each tool dispatches into the existing Next.js route handler (same validation and
 * permission checks as the web app). Static import() calls keep bundling analyzable.
 *
 * Excluded on purpose: NextAuth, Google calendar OAuth redirects, cron, Stripe webhook,
 * health, and the public token endpoints (contract signing, NPS respond).
 *
 * @typedef {{
 *   name: string,
 *   description: string,
 *   method: "GET"|"POST"|"PATCH"|"PUT"|"DELETE",
 *   path: string,
 *   load: () => Promise<Record<string, Function>>,
 *   destructive?: boolean,
 *   confirm?: boolean,
 * }} McpTool
 */

const T = "Pass query.includeTest=1 to include test data (the Testkunde). ";
const RES = ADMIN_RESOURCE_IDS.join(", ");

/** @type {McpTool[]} */
export const MCP_TOOLS = [
  // ---------- Clients ----------
  {
    name: "clients_create",
    description: "Create a client. Body: { name, cvr?, status?, ownerKey?, retainerAmount?, ... }.",
    method: "POST",
    path: "/api/clients",
    load: () => import("@/app/api/clients/route"),
  },
  {
    name: "clients_get",
    description: "Get one client (full detail: contacts, contracts, tasks, upsells, MRR). clientId is the client slug or id. " + T,
    method: "GET",
    path: "/api/clients/{clientId}",
    load: () => import("@/app/api/clients/[clientId]/route"),
  },
  {
    name: "clients_update",
    description:
      "Update a client (partial PATCH body). Includes commercial fields (retainerAmount, serviceBudgets, oneOffWebAmount, serviceAgreementAnnual, status, churn fields), owner, notes, contacts.",
    method: "PATCH",
    path: "/api/clients/{clientId}",
    load: () => import("@/app/api/clients/[clientId]/route"),
  },
  {
    name: "clients_directory_meta",
    description: "Latest activity and primary domain per client slug, as shown in the client list. " + T,
    method: "GET",
    path: "/api/clients/directory-meta",
    load: () => import("@/app/api/clients/directory-meta/route"),
  },
  {
    name: "client_notes_list",
    description: "List all notes for a client, newest first (manual notes, ClickUp customer notes and task comments). " + T,
    method: "GET",
    path: "/api/clients/{clientId}/notes",
    load: () => import("@/app/api/clients/[clientId]/notes/route"),
  },
  {
    name: "client_notes_create",
    description: "Add a note to a client. Body: { body, type?: 'note'|'call'|'meeting'|'alert' } (default 'note'). The current user is the author.",
    method: "POST",
    path: "/api/clients/{clientId}/notes",
    load: () => import("@/app/api/clients/[clientId]/notes/route"),
  },
  {
    name: "client_notes_update",
    description: "Edit a client note. Body: { body, type? }. Only the author or an admin (notes without an author: admin only).",
    method: "PATCH",
    path: "/api/clients/{clientId}/notes/{noteId}",
    load: () => import("@/app/api/clients/[clientId]/notes/[noteId]/route"),
  },
  {
    name: "client_notes_delete",
    description: "Delete a client note. Only the author or an admin.",
    method: "DELETE",
    path: "/api/clients/{clientId}/notes/{noteId}",
    load: () => import("@/app/api/clients/[clientId]/notes/[noteId]/route"),
    destructive: true,
  },
  {
    name: "client_upsells_create",
    description: "Register an upsell on a client. Body: { type, amount, soldBy?, period?, note? }. type 'one_time' counts in the sold month only.",
    method: "POST",
    path: "/api/clients/{clientId}/upsells",
    load: () => import("@/app/api/clients/[clientId]/upsells/route"),
  },
  {
    name: "client_upsells_delete",
    description: "Delete an upsell from a client.",
    method: "DELETE",
    path: "/api/clients/{clientId}/upsells/{upsellId}",
    load: () => import("@/app/api/clients/[clientId]/upsells/[upsellId]/route"),
    destructive: true,
  },
  {
    name: "client_groups_create",
    description: "Create a client group (Kundegruppe) from several clients. Body as used by the portfolio 'group' action.",
    method: "POST",
    path: "/api/clients/koncern",
    load: () => import("@/app/api/clients/koncern/route"),
  },
  {
    name: "client_groups_get",
    description: "Get a client group by cvr.",
    method: "GET",
    path: "/api/clients/koncern/{cvr}",
    load: () => import("@/app/api/clients/koncern/[cvr]/route"),
  },
  {
    name: "client_groups_update",
    description: "Update a client group by cvr (partial PATCH body).",
    method: "PATCH",
    path: "/api/clients/koncern/{cvr}",
    load: () => import("@/app/api/clients/koncern/[cvr]/route"),
  },

  // ---------- Contracts ----------
  {
    name: "contracts_list",
    description: "List contracts. " + T,
    method: "GET",
    path: "/api/contracts",
    load: () => import("@/app/api/contracts/route"),
  },
  {
    name: "contracts_get",
    description: "Get one contract with lines, status and signature info.",
    method: "GET",
    path: "/api/contracts/{contractId}",
    load: () => import("@/app/api/contracts/[contractId]/route"),
  },
  {
    name: "contracts_send",
    description: "Create and e-mail a contract for signing. Body: { clientId?, templateKey, lines, recipients, ... } (same as the 'Send kontrakt' modal).",
    method: "POST",
    path: "/api/contracts/send",
    load: () => import("@/app/api/contracts/send/route"),
  },
  {
    name: "contracts_action",
    description: "Contract action. Body: { action: 'pause'|'close'|'activate'|'renew', ... }.",
    method: "POST",
    path: "/api/contracts/{contractId}/actions",
    load: () => import("@/app/api/contracts/[contractId]/actions/route"),
  },
  {
    name: "contracts_document",
    description: "Contract document. query.format=pdf returns the PDF as a base64 resource; otherwise HTML.",
    method: "GET",
    path: "/api/contracts/{contractId}/document",
    load: () => import("@/app/api/contracts/[contractId]/document/route"),
  },
  {
    name: "contract_templates_list",
    description: "List contract templates.",
    method: "GET",
    path: "/api/contract-templates",
    load: () => import("@/app/api/contract-templates/route"),
  },
  {
    name: "contract_templates_create",
    description: "Create a contract template (admin).",
    method: "POST",
    path: "/api/contract-templates",
    load: () => import("@/app/api/contract-templates/route"),
  },
  {
    name: "contract_templates_update",
    description: "Update a contract template (admin).",
    method: "PATCH",
    path: "/api/contract-templates/{templateId}",
    load: () => import("@/app/api/contract-templates/[templateId]/route"),
  },
  {
    name: "contract_templates_delete",
    description: "Delete a contract template (admin).",
    method: "DELETE",
    path: "/api/contract-templates/{templateId}",
    load: () => import("@/app/api/contract-templates/[templateId]/route"),
    destructive: true,
  },
  {
    name: "contract_services_list",
    description: "List the contract service catalogue (key, name, billing, departmentKey, defaultAmount, active). query.all=1 includes inactive services. " + T,
    method: "GET",
    path: "/api/contract-services",
    load: () => import("@/app/api/contract-services/route"),
  },
  {
    name: "contract_services_create",
    description: "Create a contract service (admin). Body: { key, name, billing?: 'monthly'|'one_off'|'annual', departmentKey?, defaultAmount?, sortOrder? }. Or { seed: true } to save the default service list as the catalogue.",
    method: "POST",
    path: "/api/contract-services",
    load: () => import("@/app/api/contract-services/route"),
  },
  {
    name: "contract_services_update",
    description: "Update a contract service (admin). Partial body: { name?, billing?, departmentKey?, defaultAmount?, active?, sortOrder? }. Set active=false to hide it from new contracts.",
    method: "PATCH",
    path: "/api/contract-services/{serviceId}",
    load: () => import("@/app/api/contract-services/[serviceId]/route"),
  },
  {
    name: "contract_services_delete",
    description: "Delete a contract service (admin).",
    method: "DELETE",
    path: "/api/contract-services/{serviceId}",
    load: () => import("@/app/api/contract-services/[serviceId]/route"),
    destructive: true,
  },

  // ---------- Tasks ----------
  {
    name: "tasks_list",
    description: "List tasks. " + T,
    method: "GET",
    path: "/api/tasks",
    load: () => import("@/app/api/tasks/route"),
  },
  {
    name: "tasks_create",
    description: "Create a task. A real customer is REQUIRED. Body: { title, clientSlug (or clientId), departmentKey, dueDate (YYYY-MM-DD), priority, status, description, estimateHours, billable, parentTaskId?, templateKey? }.",
    method: "POST",
    path: "/api/tasks",
    load: () => import("@/app/api/tasks/route"),
  },
  {
    name: "tasks_get",
    description: "Get one task. For sub-tasks pass query.parentTaskId.",
    method: "GET",
    path: "/api/tasks/{taskId}",
    load: () => import("@/app/api/tasks/[taskId]/route"),
  },
  {
    name: "tasks_update",
    description: "Update a task (partial PATCH body: status, assignees, dueDate, title, ...).",
    method: "PATCH",
    path: "/api/tasks/{taskId}",
    load: () => import("@/app/api/tasks/[taskId]/route"),
  },
  {
    name: "tasks_delete",
    description: "Delete a task.",
    method: "DELETE",
    path: "/api/tasks/{taskId}",
    load: () => import("@/app/api/tasks/[taskId]/route"),
    destructive: true,
  },
  {
    name: "task_comments_list",
    description: "List comments on a task.",
    method: "GET",
    path: "/api/task-comments/{taskId}",
    load: () => import("@/app/api/task-comments/[taskId]/route"),
  },
  {
    name: "task_comments_create",
    description: "Add a comment to a task. Body: { body }.",
    method: "POST",
    path: "/api/task-comments/{taskId}",
    load: () => import("@/app/api/task-comments/[taskId]/route"),
  },
  {
    name: "task_templates_list",
    description: "List task templates.",
    method: "GET",
    path: "/api/task-templates",
    load: () => import("@/app/api/task-templates/route"),
  },
  {
    name: "task_templates_create",
    description: "Create a task template.",
    method: "POST",
    path: "/api/task-templates",
    load: () => import("@/app/api/task-templates/route"),
  },
  {
    name: "task_templates_get",
    description: "Get a task template.",
    method: "GET",
    path: "/api/task-templates/{templateId}",
    load: () => import("@/app/api/task-templates/[templateId]/route"),
  },
  {
    name: "task_templates_update",
    description: "Update a task template.",
    method: "PATCH",
    path: "/api/task-templates/{templateId}",
    load: () => import("@/app/api/task-templates/[templateId]/route"),
  },
  {
    name: "task_templates_delete",
    description: "Delete a task template (admin).",
    method: "DELETE",
    path: "/api/task-templates/{templateId}",
    load: () => import("@/app/api/task-templates/[templateId]/route"),
    destructive: true,
  },

  // ---------- Time ----------
  {
    name: "time_entries_list",
    description:
      "List time entries. Query: from, to (YYYY-MM-DD) or year + month. Admins can pass memberKey or userId to see another person's entries; non-admins always get their own. " +
      T,
    method: "GET",
    path: "/api/time-entries",
    load: () => import("@/app/api/time-entries/route"),
  },
  {
    name: "time_entries_create",
    description: "Log time. Body: { durationMinutes (required), workedDate (YYYY-MM-DD), workedTime (HH:mm), description (the note text), taskKey (task id), departmentKey, billable (default true) and, when billable, clientSlug or clientId (required) }. Non-billable entries are internal and are stored WITHOUT a client by design. Unknown field names are ignored, so use exactly these.",
    method: "POST",
    path: "/api/time-entries",
    load: () => import("@/app/api/time-entries/route"),
  },
  {
    name: "time_entries_get",
    description: "Get one time entry.",
    method: "GET",
    path: "/api/time-entries/{entryId}",
    load: () => import("@/app/api/time-entries/[entryId]/route"),
  },
  {
    name: "time_entries_update",
    description: "Update a time entry (partial PATCH body; same field names as time_entries_create: durationMinutes, workedDate, workedTime, description, taskKey, departmentKey, billable, clientSlug/clientId). Your own entries, or anyone's if you are admin.",
    method: "PATCH",
    path: "/api/time-entries/{entryId}",
    load: () => import("@/app/api/time-entries/[entryId]/route"),
  },
  {
    name: "time_entries_delete",
    description: "Delete a time entry. Your own entries, or anyone's if you are admin.",
    method: "DELETE",
    path: "/api/time-entries/{entryId}",
    load: () => import("@/app/api/time-entries/[entryId]/route"),
    destructive: true,
  },
  {
    name: "timer_get",
    description: "Get the running timer of the current user.",
    method: "GET",
    path: "/api/timer",
    load: () => import("@/app/api/timer/route"),
  },
  {
    name: "timer_action",
    description: "Start/stop the timer of the current user. Body as used by the timer widget (e.g. { action: 'start'|'stop', ... }).",
    method: "POST",
    path: "/api/timer",
    load: () => import("@/app/api/timer/route"),
  },

  // ---------- Brand Core (internal: TOV) ----------
  {
    name: "tov_list",
    description:
      "List Brand Core status for all clients (status, sourceCount, confidence, last analyzed, summary). " + T,
    method: "GET",
    path: "/api/tov",
    load: () => import("@/app/api/tov/route"),
  },
  {
    name: "tov_get",
    description:
      "Get a client's full Brand Core workspace: standardized profile JSON (incl. the tone of voice section), sources (metadata, no binary), brand guidelines HTML, history, model, comment, status and client domains (primary first). clientId is slug or ObjectId. " +
      T,
    method: "GET",
    path: "/api/clients/{clientId}/tov",
    load: () => import("@/app/api/clients/[clientId]/tov/route"),
  },
  {
    name: "tov_update",
    description:
      "Update a client's Brand Core. Body (one of): { comment?, model? } settings; { profile } save a hand-edited standardized profile JSON (previous version kept in history); { restoreIndex } restore a history entry. Models: claude-opus-5-5-high (default) | claude-opus-5-5 | claude-sonnet-5-5.",
    method: "PATCH",
    path: "/api/clients/{clientId}/tov",
    load: () => import("@/app/api/clients/[clientId]/tov/route"),
  },
  {
    name: "tov_sources_add",
    description:
      "Add material for Brand Core analysis. Body (one of): { url } fetch a public webpage; { text, name? } paste mail/text (min 20 chars); { file: { name, base64, mimeType? } } upload one file as base64 (pdf/image/txt/md/eml/html, max 8MB). Prefer url/text from MCP.",
    method: "POST",
    path: "/api/clients/{clientId}/tov/sources",
    load: () => import("@/app/api/clients/[clientId]/tov/sources/route"),
  },
  {
    name: "tov_sources_delete",
    description: "Remove one Brand Core source by sourceId (from tov_get.sources[].id).",
    method: "DELETE",
    path: "/api/clients/{clientId}/tov/sources/{sourceId}",
    load: () => import("@/app/api/clients/[clientId]/tov/sources/[sourceId]/route"),
    destructive: true,
  },
  {
    name: "tov_analyze",
    description:
      "Start Brand Core analysis for a client (background job; poll tov_get until status is ready/error). Body: { model?, comment?, domains? }. domains: client domains to fetch as sources; if omitted and no link source exists, the client's primary domain is analysed automatically. Models: claude-opus-5-5-high (default) | claude-opus-5-5 | claude-sonnet-5-5. Can take 1–5 minutes.",
    method: "POST",
    path: "/api/clients/{clientId}/tov/analyze",
    load: () => import("@/app/api/clients/[clientId]/tov/analyze/route"),
  },
  {
    name: "tov_analyze_cancel",
    description: "Cancel a running Brand Core analysis. The in-flight model call may finish but the result is discarded.",
    method: "DELETE",
    path: "/api/clients/{clientId}/tov/analyze",
    load: () => import("@/app/api/clients/[clientId]/tov/analyze/route"),
  },
  {
    name: "tov_preview",
    description:
      "Generate and save the client's Brand Core brand guidelines document as HTML (cover, brand essence, tone of voice principles with do/don't, colour palette, typography, messaging; synchronous, 30–120s). Body: { model? } (default claude-opus-5-5-high). Requires an existing profile (run tov_analyze first).",
    method: "POST",
    path: "/api/clients/{clientId}/tov/preview",
    load: () => import("@/app/api/clients/[clientId]/tov/preview/route"),
  },
  {
    name: "tov_rewrite",
    description:
      "Rewrite arbitrary text in the client's tone of voice from their Brand Core profile (not stored). Body: { text, model? }. Returns { rewritten, changes[] }. Requires an existing profile.",
    method: "POST",
    path: "/api/clients/{clientId}/tov/rewrite",
    load: () => import("@/app/api/clients/[clientId]/tov/rewrite/route"),
  },

  // ---------- NPS ----------
  {
    name: "nps_overview",
    description: "NPS overview and responses. " + T,
    method: "GET",
    path: "/api/nps",
    load: () => import("@/app/api/nps/route"),
  },
  {
    name: "nps_send",
    description: "Send an NPS survey to a client. Body as used by the NPS 'send' action.",
    method: "POST",
    path: "/api/nps/send",
    load: () => import("@/app/api/nps/send/route"),
  },
  {
    name: "nps_settings_get",
    description: "Get global NPS settings.",
    method: "GET",
    path: "/api/nps/settings",
    load: () => import("@/app/api/nps/settings/route"),
  },
  {
    name: "nps_settings_update",
    description: "Update global NPS settings (admin).",
    method: "PATCH",
    path: "/api/nps/settings",
    load: () => import("@/app/api/nps/settings/route"),
  },
  {
    name: "nps_client_settings_update",
    description: "Update NPS settings for one client slug.",
    method: "PATCH",
    path: "/api/nps/clients/{clientSlug}/settings",
    load: () => import("@/app/api/nps/clients/[clientSlug]/settings/route"),
  },
  {
    name: "nps_client_template_update",
    description: "Set the NPS template for one client slug.",
    method: "PATCH",
    path: "/api/nps/clients/{clientSlug}/template",
    load: () => import("@/app/api/nps/clients/[clientSlug]/template/route"),
  },
  {
    name: "nps_templates_create",
    description: "Create an NPS template (admin).",
    method: "POST",
    path: "/api/nps/templates",
    load: () => import("@/app/api/nps/templates/route"),
  },
  {
    name: "nps_templates_update",
    description: "Update an NPS template (admin).",
    method: "PATCH",
    path: "/api/nps/templates/{templateKey}",
    load: () => import("@/app/api/nps/templates/[templateKey]/route"),
  },

  // ---------- Knowledge base ----------
  {
    name: "kb_list",
    description: "List knowledge base articles.",
    method: "GET",
    path: "/api/kb",
    load: () => import("@/app/api/kb/route"),
  },
  {
    name: "kb_create",
    description:
      "Create a knowledge base article. Body: { title, sectionId, bodyMd?, summary?, published?, featured?, icon?, headerImageUrl? }. An empty or missing summary is generated with AI from title + body.",
    method: "POST",
    path: "/api/kb",
    load: () => import("@/app/api/kb/route"),
  },
  {
    name: "kb_summary",
    description: "Generate a short AI summary from { title, bodyMd } without saving anything. Returns { summary }.",
    method: "POST",
    path: "/api/kb/summary",
    load: () => import("@/app/api/kb/summary/route"),
  },
  {
    name: "kb_tags",
    description: "List knowledge base tags.",
    method: "GET",
    path: "/api/kb/tags",
    load: () => import("@/app/api/kb/tags/route"),
  },
  {
    name: "kb_get",
    description: "Get a knowledge base article by slug.",
    method: "GET",
    path: "/api/kb/{slug}",
    load: () => import("@/app/api/kb/[slug]/route"),
  },
  {
    name: "kb_update",
    description:
      "Update a knowledge base article (partial body: title, sectionId, bodyMd, summary, published, featured, icon, headerImageUrl, archived). summary: '' regenerates it with AI; omit it to keep the current one.",
    method: "PATCH",
    path: "/api/kb/{slug}",
    load: () => import("@/app/api/kb/[slug]/route"),
  },
  {
    name: "kb_delete",
    description: "Delete a knowledge base article (admin).",
    method: "DELETE",
    path: "/api/kb/{slug}",
    load: () => import("@/app/api/kb/[slug]/route"),
    destructive: true,
  },

  // ---------- Toolbox ----------
  {
    name: "toolbox_list",
    description: "List the internal tools in Toolbox (id, name, url, description, category, adminOnly). Admin-only tools are returned to admins only.",
    method: "GET",
    path: "/api/toolbox",
    load: () => import("@/app/api/toolbox/route"),
  },
  {
    name: "toolbox_create",
    description: "Add a tool to Toolbox (admin). Body: { name, url, description?, category?, adminOnly?, sortOrder? }. url without scheme gets https://.",
    method: "POST",
    path: "/api/toolbox",
    load: () => import("@/app/api/toolbox/route"),
  },
  {
    name: "toolbox_update",
    description: "Update a Toolbox tool (admin). Partial body: { name?, url?, description?, category?, adminOnly?, sortOrder? }.",
    method: "PATCH",
    path: "/api/toolbox/{toolId}",
    load: () => import("@/app/api/toolbox/[toolId]/route"),
  },
  {
    name: "toolbox_delete",
    description: "Remove a tool from Toolbox (admin).",
    method: "DELETE",
    path: "/api/toolbox/{toolId}",
    load: () => import("@/app/api/toolbox/[toolId]/route"),
    destructive: true,
  },

  // ---------- Team, users, workload, pulse ----------
  {
    name: "team_list",
    description: "List team members.",
    method: "GET",
    path: "/api/team",
    load: () => import("@/app/api/team/route"),
  },
  {
    name: "team_update",
    description: "Update a team member by memberKey (admin).",
    method: "PATCH",
    path: "/api/team/{memberKey}",
    load: () => import("@/app/api/team/[memberKey]/route"),
  },
  {
    name: "users_list",
    description: "List user accounts (admin).",
    method: "GET",
    path: "/api/users",
    load: () => import("@/app/api/users/route"),
  },
  {
    name: "users_get",
    description: "Get a user account (admin).",
    method: "GET",
    path: "/api/users/{userId}",
    load: () => import("@/app/api/users/[userId]/route"),
  },
  {
    name: "users_update",
    description: "Update a user account: name, isAdmin, active, etc. (admin; guardrails against removing the last admin).",
    method: "PATCH",
    path: "/api/users/{userId}",
    load: () => import("@/app/api/users/[userId]/route"),
  },
  {
    name: "workload_overview",
    description: "Workload overview for the whole team.",
    method: "GET",
    path: "/api/workload",
    load: () => import("@/app/api/workload/route"),
  },
  {
    name: "workload_member",
    description: "Workload for one team member.",
    method: "GET",
    path: "/api/workload/{memberKey}",
    load: () => import("@/app/api/workload/[memberKey]/route"),
  },
  {
    name: "pulse_get",
    description: "Pulse dashboard data (MRR, KPIs). " + T,
    method: "GET",
    path: "/api/pulse",
    load: () => import("@/app/api/pulse/route"),
  },
  {
    name: "notifications_list",
    description: "List notifications for the current user. Query: limit.",
    method: "GET",
    path: "/api/notifications",
    load: () => import("@/app/api/notifications/route"),
  },
  {
    name: "notifications_update",
    description: "Update notifications (e.g. mark all read) for the current user.",
    method: "PATCH",
    path: "/api/notifications",
    load: () => import("@/app/api/notifications/route"),
  },
  {
    name: "notification_update",
    description: "Update one notification (e.g. mark read).",
    method: "PATCH",
    path: "/api/notifications/{notificationId}",
    load: () => import("@/app/api/notifications/[notificationId]/route"),
  },

  // ---------- Calendar ----------
  {
    name: "calendar_get",
    description: "Calendar events. Query: timeMin, timeMax (ISO), includeGoogle=0|1.",
    method: "GET",
    path: "/api/calendar",
    load: () => import("@/app/api/calendar/route"),
  },
  {
    name: "calendar_google_status",
    description: "Google calendar connection status of the current user.",
    method: "GET",
    path: "/api/calendar/google/status",
    load: () => import("@/app/api/calendar/google/status/route"),
  },
  {
    name: "calendar_google_status_update",
    description: "Update the Google calendar connection (e.g. disconnect).",
    method: "POST",
    path: "/api/calendar/google/status",
    load: () => import("@/app/api/calendar/google/status/route"),
  },
  {
    name: "calendar_schedule_create",
    description: "Schedule a task into a calendar slot.",
    method: "POST",
    path: "/api/calendar/schedule",
    load: () => import("@/app/api/calendar/schedule/route"),
  },
  {
    name: "calendar_schedule_update",
    description: "Update a scheduled slot.",
    method: "PATCH",
    path: "/api/calendar/schedule",
    load: () => import("@/app/api/calendar/schedule/route"),
  },
  {
    name: "calendar_schedule_delete",
    description: "Delete a scheduled slot. Query: taskId or slotId.",
    method: "DELETE",
    path: "/api/calendar/schedule",
    load: () => import("@/app/api/calendar/schedule/route"),
    destructive: true,
  },

  // ---------- Settings (admin) ----------
  {
    name: "settings_agency_get",
    description: "Agency settings (admin).",
    method: "GET",
    path: "/api/settings/agency",
    load: () => import("@/app/api/settings/agency/route"),
  },
  {
    name: "settings_agency_update",
    description: "Update agency settings (admin).",
    method: "PATCH",
    path: "/api/settings/agency",
    load: () => import("@/app/api/settings/agency/route"),
  },
  {
    name: "settings_agency_reset",
    description: "Reset agency settings to defaults (admin).",
    method: "DELETE",
    path: "/api/settings/agency",
    load: () => import("@/app/api/settings/agency/route"),
    destructive: true,
  },
  {
    name: "settings_apex_indeks_get",
    description: "Apex (YoY indeks) settings/status.",
    method: "GET",
    path: "/api/settings/apex-indeks",
    load: () => import("@/app/api/settings/apex-indeks/route"),
  },
  {
    name: "settings_apex_indeks_sync",
    description: "Trigger an Apex indeks sync.",
    method: "POST",
    path: "/api/settings/apex-indeks",
    load: () => import("@/app/api/settings/apex-indeks/route"),
  },
  {
    name: "settings_test_customer_get",
    description: "Status of the Testkunde ApS test customer.",
    method: "GET",
    path: "/api/settings/test-customer",
    load: () => import("@/app/api/settings/test-customer/route"),
  },
  {
    name: "settings_test_customer_action",
    description: "Create/recreate/delete the test customer. Body: { action: 'create'|'recreate'|'delete' }.",
    method: "POST",
    path: "/api/settings/test-customer",
    load: () => import("@/app/api/settings/test-customer/route"),
    destructive: true,
  },
  ...["customers", "disciplines", "knowledge", "tasks", "users"].flatMap((kind) => [
    {
      name: `clickup_${kind}_preview`,
      description: `ClickUp sync preview for ${kind} (admin, read-only dry run).`,
      method: /** @type {const} */ ("POST"),
      path: `/api/settings/clickup/${kind}/preview`,
      load: () => importClickUp(kind, "preview"),
    },
    {
      name: `clickup_${kind}_apply`,
      description: `ClickUp sync apply for ${kind} (admin, writes to the database).`,
      method: /** @type {const} */ ("POST"),
      path: `/api/settings/clickup/${kind}/apply`,
      load: () => importClickUp(kind, "apply"),
      destructive: true,
    },
  ]),

  // ---------- Generic admin CRUD ----------
  {
    name: "crm_resource_list",
    description: `List all rows of an admin (Stamdata) resource. resource is one of: ${RES}. query.testFilter may be all|production|test.`,
    method: "GET",
    path: "/api/crm/{resource}",
    load: () => import("@/app/api/crm/[resource]/route"),
  },
  {
    name: "crm_resource_create",
    description: `Create a row in an admin resource (${RES}). Body = the document fields.`,
    method: "POST",
    path: "/api/crm/{resource}",
    load: () => import("@/app/api/crm/[resource]/route"),
  },
  {
    name: "crm_resource_get",
    description: `Get one row of an admin resource (${RES}).`,
    method: "GET",
    path: "/api/crm/{resource}/{id}",
    load: () => import("@/app/api/crm/[resource]/[id]/route"),
  },
  {
    name: "crm_resource_update",
    description: `Update one row of an admin resource (${RES}). Partial PATCH body.`,
    method: "PATCH",
    path: "/api/crm/{resource}/{id}",
    load: () => import("@/app/api/crm/[resource]/[id]/route"),
  },
  {
    name: "crm_resource_delete",
    description: `Delete one row of an admin resource (${RES}).`,
    method: "DELETE",
    path: "/api/crm/{resource}/{id}",
    load: () => import("@/app/api/crm/[resource]/[id]/route"),
    destructive: true,
  },
  {
    name: "crm_seed_test",
    description: "Seed demo/test data (admin).",
    method: "POST",
    path: "/api/crm/seed-test",
    load: () => import("@/app/api/crm/seed-test/route"),
    destructive: true,
  },
  {
    name: "crm_reset_demo",
    description:
      "DESTRUCTIVE: wipes and re-seeds the demo data. Requires body.confirm === 'RESET DEMO'. Never call without explicit user approval.",
    method: "POST",
    path: "/api/crm/reset-demo",
    load: () => import("@/app/api/crm/reset-demo/route"),
    destructive: true,
    confirm: true,
  },
];

/** Static, analyzable ClickUp loaders. */
function importClickUp(kind, step) {
  const table = {
    "customers/preview": () => import("@/app/api/settings/clickup/customers/preview/route"),
    "customers/apply": () => import("@/app/api/settings/clickup/customers/apply/route"),
    "disciplines/preview": () => import("@/app/api/settings/clickup/disciplines/preview/route"),
    "disciplines/apply": () => import("@/app/api/settings/clickup/disciplines/apply/route"),
    "knowledge/preview": () => import("@/app/api/settings/clickup/knowledge/preview/route"),
    "knowledge/apply": () => import("@/app/api/settings/clickup/knowledge/apply/route"),
    "tasks/preview": () => import("@/app/api/settings/clickup/tasks/preview/route"),
    "tasks/apply": () => import("@/app/api/settings/clickup/tasks/apply/route"),
    "users/preview": () => import("@/app/api/settings/clickup/users/preview/route"),
    "users/apply": () => import("@/app/api/settings/clickup/users/apply/route"),
  };
  return table[`${kind}/${step}`]();
}

export const TOOLS_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));

/** @param {McpTool} tool */
export function pathParamNames(tool) {
  return [...tool.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

/** @param {McpTool} tool */
export function toolInputSchema(tool) {
  const names = pathParamNames(tool);
  /** @type {Record<string, unknown>} */
  const properties = {};
  for (const n of names) properties[n] = { type: "string", description: `Path parameter {${n}}` };
  properties.query = {
    type: "object",
    description: "Optional URL query parameters as key/value strings.",
    additionalProperties: { type: ["string", "number", "boolean"] },
  };
  if (tool.method !== "GET" && tool.method !== "DELETE") {
    properties.body = { type: "object", description: "JSON request body." };
  } else if (tool.method === "DELETE") {
    properties.body = { type: "object", description: "Optional JSON body." };
  }
  return { type: "object", properties, required: names };
}

/** @param {McpTool} tool */
export function toolDescriptor(tool) {
  return {
    name: tool.name,
    description: `[${tool.method} ${tool.path}] ${tool.description}`,
    inputSchema: toolInputSchema(tool),
    annotations: {
      readOnlyHint: tool.method === "GET",
      destructiveHint: tool.destructive === true,
      idempotentHint: tool.method === "GET" || tool.method === "PATCH" || tool.method === "DELETE",
      openWorldHint: false,
    },
  };
}
