/** Always black labels on status-tinted calendar / sidebar cards. */
export const CALENDAR_CARD_TEXT_COLOR = "#111111";

/**
 * @param {{ assigneeId?: string; assigneeIds?: string[] }} task
 */
export function assigneeKeysFromTask(task) {
  if (Array.isArray(task.assigneeIds) && task.assigneeIds.length) {
    return task.assigneeIds.filter((id) => typeof id === "string" && id.trim());
  }
  return task.assigneeId?.trim() ? [task.assigneeId.trim()] : [];
}

/**
 * @param {{ assigneeId?: string; assigneeIds?: string[] }} task
 * @param {Record<string, { id: string; name?: string; avatar?: string; image?: string; hue?: number }>} teamById
 */
export function resolveTaskAssignees(task, teamById) {
  return assigneeKeysFromTask(task)
    .map((id) => teamById[id])
    .filter(Boolean);
}

/**
 * @param {Array<{ id: string; name?: string; avatar?: string; image?: string; hue?: number }>} assignees
 */
export function assigneesForEventProps(assignees) {
  return assignees.slice(0, 3).map((a) => ({
    id: a.id,
    avatar: a.avatar ?? a.name?.slice(0, 2) ?? "?",
    name: a.name ?? "",
    image: typeof a.image === "string" ? a.image : "",
    hue: typeof a.hue === "number" ? a.hue : 220,
  }));
}

/**
 * @param {Array<{ id: string; name?: string; avatar?: string; image?: string; hue?: number }>} team
 */
export function teamByIdFromTeam(team) {
  /** @type {Record<string, { id: string; name?: string; avatar?: string; image?: string; hue?: number }>} */
  const map = {};
  for (const member of team) {
    if (member?.id) map[member.id] = member;
  }
  return map;
}
