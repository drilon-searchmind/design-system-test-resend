import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import {
  classifySyncRow,
  countSyncKinds,
  snapshotFields,
} from "@/lib/server/clickup-sync-utils";
import { syncMemberDisciplinesFromClients } from "@/lib/server/sync-member-disciplines";

const COMPARE_FIELDS = ["primaryDept", "disciplineKeys", "name"];

/**
 * @param {{ primaryDept: string; disciplineKeys: string[]; name?: string }} value
 */
function disciplineSnapshot(value) {
  return snapshotFields(
    {
      name: value.name ?? "",
      primaryDept: value.primaryDept,
      disciplineKeys: value.disciplineKeys.join("|"),
    },
    COMPARE_FIELDS,
  );
}

export async function previewClickUpDisciplinesSync() {
  const result = await syncMemberDisciplinesFromClients({ dryRun: true });
  await connectDb();

  const changeKeys = result.changes.map((change) => change.key);
  const members = changeKeys.length
    ? await TeamMember.find({ key: { $in: changeKeys } })
        .select("key name departmentKey disciplineKeys")
        .lean()
    : [];

  /** @type {Map<string, Record<string, unknown>>} */
  const memberByKey = new Map(
    members.map((member) => [String(member.key), /** @type {Record<string, unknown>} */ (member)]),
  );

  /** @type {Array<ReturnType<typeof classifySyncRow>>} */
  const previewRows = [];

  for (const change of result.changes) {
    const member = memberByKey.get(change.key);
    const current = member
      ? disciplineSnapshot({
          name: String(member.name ?? ""),
          primaryDept: String(member.departmentKey ?? ""),
          disciplineKeys: Array.isArray(member.disciplineKeys)
            ? member.disciplineKeys.map(String)
            : [],
        })
      : null;

    const proposed = disciplineSnapshot({
      name: change.name,
      primaryDept: change.primaryDept,
      disciplineKeys: change.disciplineKeys,
    });

    previewRows.push(
      classifySyncRow({
        id: change.key,
        linkUrl: "",
        proposed,
        current,
        compareFields: COMPARE_FIELDS,
      }),
    );
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceLabel: "Klient deptAssignees → TeamMember.disciplineKeys",
    total: result.membersTotal,
    clientsScanned: result.clientsScanned,
    unmatchedAssigneeCount: result.unmatchedAssigneeCount,
    unmatchedAssigneeNames: result.unmatchedAssigneeNames,
    counts: {
      new: 0,
      update: previewRows.length,
      unchanged: result.membersUnchanged,
      skipped: 0,
    },
    rows: previewRows,
  };
}

/**
 * @param {string[]} memberKeys
 */
export async function applyClickUpDisciplinesSync(memberKeys) {
  const keys = [...new Set(memberKeys.map((key) => String(key ?? "").trim()).filter(Boolean))];
  if (!keys.length) {
    return { ok: false, error: "Ingen medlemmer valgt", status: 400 };
  }

  const result = await syncMemberDisciplinesFromClients({
    dryRun: false,
    memberKeys: keys,
  });

  return {
    ok: true,
    imported: result.membersUpdated,
    skipped: keys.length - result.membersUpdated,
    errors: [],
    total: keys.length,
    appliedIds: keys,
    clientsScanned: result.clientsScanned,
    departmentsCreated: result.departmentsCreated,
  };
}
