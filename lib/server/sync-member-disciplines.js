import Client from "@/lib/db/models/client";
import Department from "@/lib/db/models/department";
import TeamMember from "@/lib/db/models/team-member";
import { ALL_KNOWN_DEPARTMENTS } from "@/lib/crm/dept-keys";
import { buildMemberDisciplineMap, resolveAssigneeToMemberKey } from "@/lib/crm/member-discipline-map";
import { connectDb } from "@/lib/db/mongoose";

/** @param {string} color */
function colorTokenFromVar(color) {
  const m = String(color).match(/var\(--([^)]+)\)/);
  return m ? m[1] : "dep-seo";
}

/** Ensure Department docs exist for roster / workload filters. */
export async function ensureDepartmentsFromCatalog() {
  let created = 0;
  for (const d of ALL_KNOWN_DEPARTMENTS) {
    const existing = await Department.findOne({ key: d.id }).select("_id").lean();
    if (existing) continue;
    await Department.create({
      key: d.id,
      name: d.name,
      shortLabel: d.short,
      capacityHours: d.capacity,
      colorToken: colorTokenFromVar(d.color),
    });
    created += 1;
  }
  return created;
}

/**
 * Scan client deptAssignees → update TeamMember.departmentKey + disciplineKeys.
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function syncMemberDisciplinesFromClients(opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  await connectDb();

  const deptsCreated = dryRun ? 0 : await ensureDepartmentsFromCatalog();

  const [clients, members, departments] = await Promise.all([
    Client.find({}).select("name deptAssignees").lean(),
    TeamMember.find({ active: { $ne: false } }).select("key name departmentKey disciplineKeys").lean(),
    Department.find({}).select("key _id").lean(),
  ]);

  /** @type {Map<string, import('mongoose').Types.ObjectId>} */
  const deptIdByKey = new Map(
    departments.map((d) => [String(d.key), /** @type {import('mongoose').Types.ObjectId} */ (d._id)]),
  );

  const memberPicklist = members.map((m) => ({
    key: String(m.key),
    name: String(m.name),
  }));

  const disciplineMap = buildMemberDisciplineMap(clients, memberPicklist);

  /** @type {string[]} */
  const unmatchedAssignees = [];
  /** @type {Record<string, number>} */
  const unmatchedByRaw = {};

  for (const client of clients) {
    const assignees = client.deptAssignees;
    const raw =
      assignees instanceof Map ? Object.fromEntries(assignees)
      : assignees && typeof assignees === "object" ? assignees
      : {};
    for (const val of Object.values(/** @type {Record<string, unknown>} */ (raw))) {
      const name = String(val ?? "").trim();
      if (!name) continue;
      if (!resolveAssigneeToMemberKey(name, memberPicklist)) {
        unmatchedByRaw[name] = (unmatchedByRaw[name] ?? 0) + 1;
      }
    }
  }
  for (const name of Object.keys(unmatchedByRaw)) {
    unmatchedAssignees.push(name);
  }
  unmatchedAssignees.sort((a, b) => (unmatchedByRaw[b] ?? 0) - (unmatchedByRaw[a] ?? 0));

  let updated = 0;
  let unchanged = 0;
  /** @type {Array<{ key: string; name: string; primaryDept: string; disciplineKeys: string[]; assignmentCount: number }>} */
  const changes = [];

  for (const member of members) {
    const mk = String(member.key);
    const mapped = disciplineMap.get(mk);
    if (!mapped) {
      unchanged += 1;
      continue;
    }

    const deptId = deptIdByKey.get(mapped.primaryDept) ?? null;
    const prevKeys = Array.isArray(member.disciplineKeys) ? member.disciplineKeys.map(String) : [];
    const prevDept = String(member.departmentKey ?? "");
    const sameDept = prevDept === mapped.primaryDept;
    const sameKeys =
      prevKeys.length === mapped.disciplineKeys.length &&
      prevKeys.every((k, i) => k === mapped.disciplineKeys[i]);

    if (sameDept && sameKeys) {
      unchanged += 1;
      continue;
    }

    changes.push({
      key: mk,
      name: String(member.name),
      primaryDept: mapped.primaryDept,
      disciplineKeys: mapped.disciplineKeys,
      assignmentCount: mapped.assignmentCount,
    });

    if (!dryRun) {
      await TeamMember.updateOne(
        { _id: member._id },
        {
          $set: {
            departmentKey: mapped.primaryDept,
            departmentId: deptId,
            disciplineKeys: mapped.disciplineKeys,
          },
        },
      );
    }
    updated += 1;
  }

  return {
    ok: true,
    dryRun,
    clientsScanned: clients.length,
    membersTotal: members.length,
    membersUpdated: updated,
    membersUnchanged: unchanged,
    membersWithDiscipline: disciplineMap.size,
    departmentsCreated: deptsCreated,
    unmatchedAssigneeNames: unmatchedAssignees.slice(0, 25),
    unmatchedAssigneeCount: unmatchedAssignees.length,
    changes: changes.sort((a, b) => a.name.localeCompare(b.name, "da")),
  };
}
