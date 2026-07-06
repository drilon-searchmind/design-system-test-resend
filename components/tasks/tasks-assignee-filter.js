"use client";

import { TeamMemberMultiSelect, TEAM_MEMBER_UNASSIGNED_KEY } from "@/components/tasks/team-member-multi-select";

export const TASKS_UNASSIGNED_ASSIGNEE_KEY = TEAM_MEMBER_UNASSIGNED_KEY;

/**
 * @param {{
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   mineAssigneeKey: string;
 *   selected: Set<string>;
 *   onChange: (next: Set<string>) => void;
 *   hasUnassignedTasks?: boolean;
 * }} props
 */
export function TasksAssigneeFilter({
  team,
  mineAssigneeKey,
  selected,
  onChange,
  hasUnassignedTasks = false,
}) {
  return (
    <TeamMemberMultiSelect
      team={team}
      selected={selected}
      onChange={onChange}
      mineAssigneeKey={mineAssigneeKey}
      includeUnassigned={hasUnassignedTasks}
      emptyLabel="Ingen ansvarlige"
      allSelectedLabel="Alle ansvarlige"
      countLabel={(n) => `${n} ansvarlige`}
      showQuickActions
    />
  );
}

/** @param {string} mineAssigneeKey @param {Array<{ id: string }>} team */
export function defaultTasksAssigneeSelection(mineAssigneeKey, team) {
  if (mineAssigneeKey) return new Set([mineAssigneeKey]);
  return new Set(team.map((t) => t.id));
}

/**
 * @param {{ assigneeId?: string; assigneeIds?: string[] }} task
 * @param {Set<string>} selected
 */
export function taskMatchesAssigneeFilter(task, selected) {
  if (selected.size === 0) return false;
  const ids =
    Array.isArray(task.assigneeIds) && task.assigneeIds.length ?
      task.assigneeIds.filter((id) => typeof id === "string" && id.trim())
    : task.assigneeId?.trim() ?
      [task.assigneeId.trim()]
    : [];
  if (ids.length === 0) return selected.has(TASKS_UNASSIGNED_ASSIGNEE_KEY);
  return ids.some((id) => selected.has(id));
}

/**
 * @param {Set<string>} selected
 * @param {Array<{ id: string; name: string }>} team
 * @param {string} mineAssigneeKey
 * @param {boolean} [hasUnassignedTasks]
 */
export function formatTasksAssigneeFilterLabel(selected, team, mineAssigneeKey, hasUnassignedTasks = false) {
  if (selected.size === 0) return null;
  const allMemberKeys = new Set(team.map((t) => t.id));
  if (hasUnassignedTasks) allMemberKeys.add(TASKS_UNASSIGNED_ASSIGNEE_KEY);
  const isAllSelected = [...allMemberKeys].every((id) => selected.has(id));
  if (isAllSelected) return "Alle ansvarlige";
  if (selected.size === 1) {
    const only = [...selected][0];
    if (only === TASKS_UNASSIGNED_ASSIGNEE_KEY) return "Ikke tildelt";
    const match = team.find((t) => t.id === only);
    const name = match?.name ?? only;
    if (only === mineAssigneeKey) return `Mine: ${name}`;
    return name;
  }
  return `${selected.size} ansvarlige`;
}
