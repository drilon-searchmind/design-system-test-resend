/**
 * @typedef {{
 *   title: string;
 *   hint: string;
 *   priority: string;
 *   dueDate: string;
 *   estimateHours: string;
 *   departmentKey: string;
 *   assigneeMemberKey: string;
 *   clientSlug: string;
 * }} TaskEditDraft
 */

/** @param {Record<string, unknown>} wire */
export function taskWireToEditDraft(wire) {
  const dept = typeof wire.dept === "string" ? wire.dept.trim() : "";
  const due = typeof wire.dueDate === "string" ? wire.dueDate.trim().slice(0, 10) : "";
  return {
    title: typeof wire.title === "string" ? wire.title : "",
    hint: typeof wire.hint === "string" ? wire.hint : "",
    priority:
      wire.priority === "high" || wire.priority === "low" ? String(wire.priority) : "medium",
    dueDate: due,
    estimateHours:
      typeof wire.estimateHours === "number" && Number.isFinite(wire.estimateHours) ?
        String(wire.estimateHours)
      : "",
    departmentKey: dept === "—" ? "" : dept,
    assigneeMemberKey: typeof wire.assigneeId === "string" ? wire.assigneeId.trim() : "",
    clientSlug: typeof wire.clientId === "string" ? wire.clientId.trim() : "",
  };
}

/** @param {TaskEditDraft} draft */
export function editDraftToPatch(draft) {
  /** @type {Record<string, unknown>} */
  const body = {
    title: draft.title.trim(),
    hint: draft.hint,
    priority: draft.priority,
  };
  if (draft.dueDate.trim()) body.dueDate = draft.dueDate.trim().slice(0, 10);
  else body.dueDate = null;
  if (!draft.departmentKey.trim() || draft.departmentKey === "—") body.departmentKey = null;
  else body.departmentKey = draft.departmentKey.trim();
  if (!draft.assigneeMemberKey.trim()) body.assigneeMemberKey = null;
  else body.assigneeMemberKey = draft.assigneeMemberKey.trim();
  if (draft.clientSlug.trim()) body.clientSlug = draft.clientSlug.trim();

  const ehRaw = draft.estimateHours.trim().replace(",", ".");
  if (ehRaw === "") body.estimateHours = null;
  else {
    const eh = Number.parseFloat(ehRaw);
    if (Number.isFinite(eh) && eh >= 0) body.estimateHours = eh;
  }

  return body;
}

/** @param {'todo' | 'doing' | 'review' | 'done' | 'blocked' | 'cancelled'} status */
export function taskStatusPatch(status) {
  return { status };
}
