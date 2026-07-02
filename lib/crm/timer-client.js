import { emitTimerSessionChanged } from "@/lib/crm/timer-session-events";

/**
 * @param {{
 *   clientSlug: string;
 *   taskKey?: string;
 *   description?: string;
 *   billable?: boolean;
 * }} params
 */
export async function startTimerForTask(params) {
  const res = await fetch("/api/timer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start",
      clientSlug: params.clientSlug,
      taskKey: params.taskKey || undefined,
      description: typeof params.description === "string" ? params.description : "",
      billable: params.billable !== false,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke starte timer");
  }
  emitTimerSessionChanged();
  return data;
}

/** Stop the active timer session and persist a time entry. */
export async function stopActiveTimer() {
  const res = await fetch("/api/timer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "stop" }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke stoppe timer");
  }
  emitTimerSessionChanged();
  return data;
}
