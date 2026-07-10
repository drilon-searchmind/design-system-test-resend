import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { deptMeta, deptShortLabels } from "@/lib/crm/dept-keys";
import { usersAgencyStatsFromList } from "@/lib/crm/users-utils";
import { connectDb } from "@/lib/db/mongoose";
import { assigneeMemberKeyForDbUser } from "@/lib/server/session-team-member";

/**
 * Auth-brugere fra `User` — kobling til roster via `TeamMember.userId`.
 * Ingen seed-brugere: listen er tom indtil SSO opretter konti.
 *
 * @param {{ session?: unknown }} [opts]
 */
export async function fetchUsersAdminPortfolio(opts = {}) {
  await connectDb();
  const usersRaw = await User.find().sort({ email: 1 }).lean();
  const ids = usersRaw.map((u) => u._id).filter((id) => id != null);

  const members =
    ids.length > 0 ?
      await TeamMember.find({ userId: { $in: ids } })
        .select("key userId departmentKey disciplineKeys avatarInitials hue")
        .lean()
    : [];
  /** @type {Map<string, { key: string; departmentKey: string | null; disciplineKeys: string[]; disciplineLabels: string[]; avatarInitials: string; hue: number }>} */
  const rosterByUserId = new Map(
    members.map((m) => {
      const disciplineKeys = Array.isArray(m.disciplineKeys)
        ? m.disciplineKeys.map(String).filter(Boolean)
        : m.departmentKey
          ? [String(m.departmentKey)]
          : [];
      return [
        String(m.userId),
        {
          key: String(m.key ?? ""),
          departmentKey: m.departmentKey ? String(m.departmentKey) : null,
          disciplineKeys,
          disciplineLabels: deptShortLabels(disciplineKeys),
          avatarInitials: String(
            m.avatarInitials ?? m.name?.toString().slice(0, 2).toUpperCase() ?? "?",
          ),
          hue: typeof m.hue === "number" ? m.hue : 220,
        },
      ];
    }),
  );

  const rows = usersRaw.map((doc) => {
    const oid = String(doc._id);
    const isAdmin = doc.isAdmin === true;
    const roster = rosterByUserId.get(oid);
    const teamMemberId = roster?.key || null;
    const departmentKey = roster?.departmentKey ?? null;
    const disciplineKeys = roster?.disciplineKeys ?? [];
    const disciplineLabels = roster?.disciplineLabels ?? [];
    const departmentLabel =
      disciplineLabels.length > 0 ?
        disciplineLabels.join(" · ")
      : departmentKey ?
        (deptMeta(departmentKey)?.short ?? departmentKey)
      : null;
    const updated = doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null;
    return {
      id: `u-${oid}`,
      email: String(doc.email ?? ""),
      name: String(doc.name ?? doc.email ?? "?"),
      image: String(doc.image ?? "").trim() || null,
      avatar: roster?.avatarInitials ?? String(doc.name ?? "?").slice(0, 2).toUpperCase(),
      hue: roster?.hue ?? 220,
      isAdmin,
      status: /** @type {const} */ ("active"),
      teamMemberId,
      departmentKey,
      disciplineKeys,
      departmentLabel,
      mfaEnabled: false,
      lastSeenAt: updated,
      invitedAt: null,
      provisionedVia: String(doc.provisionedVia ?? "workspace_google_sso"),
    };
  });

  /** @type {string | null} */
  let mineTeamMemberKey = null;
  /** @type {string | null} */
  let mineLabel = null;
  if (opts.session != null) {
    mineTeamMemberKey = await assigneeMemberKeyForDbUser(opts.session);
    const match = rows.find((r) => r.teamMemberId && mineTeamMemberKey && r.teamMemberId === mineTeamMemberKey);
    mineLabel = match?.name ?? null;
  }

  return {
    source: "database",
    users: rows,
    stats: usersAgencyStatsFromList(rows),
    mineTeamMemberKey,
    mineLabel,
  };
}
