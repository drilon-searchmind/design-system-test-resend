import {
  csvRowToUserImport,
  fetchClickUpUserRows,
} from "@/lib/clickup/import-users";
import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import {
  classifySyncRow,
  countSyncKinds,
  snapshotFields,
} from "@/lib/server/clickup-sync-utils";

const COMPARE_FIELDS = [
  "name",
  "email",
  "teamMemberKey",
  "avatarInitials",
  "hue",
  "weeklyHours",
  "active",
  "accessTier",
  "image",
];

/**
 * @param {ReturnType<typeof csvRowToUserImport>} mapped
 * @param {Record<string, unknown> | null | undefined} existingMember
 */
function proposedUserSnapshot(mapped, existingMember) {
  if (!mapped) return null;

  const teamMemberKey =
    existingMember && typeof existingMember.key === "string" && existingMember.key.trim()
      ? String(existingMember.key).trim()
      : mapped.teamMember.key;

  return snapshotFields(
    {
      name: mapped.user.name,
      email: mapped.user.email,
      teamMemberKey,
      avatarInitials: mapped.teamMember.avatarInitials,
      hue: mapped.teamMember.hue,
      weeklyHours: mapped.teamMember.weeklyHours,
      active: mapped.teamMember.active,
      accessTier: mapped.user.accessTier,
      image: mapped.user.image,
    },
    COMPARE_FIELDS,
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} member
 */
function currentUserSnapshot(user, member) {
  if (!user && !member) return null;
  return snapshotFields(
    {
      name: user?.name,
      email: user?.email,
      teamMemberKey: member?.key,
      avatarInitials: member?.avatarInitials,
      hue: member?.hue,
      weeklyHours: member?.weeklyHours,
      active: member?.active,
      accessTier: user?.accessTier,
      image: user?.image,
    },
    COMPARE_FIELDS,
  );
}

export async function previewClickUpUsersSync() {
  const { rows, listId } = await fetchClickUpUserRows();
  await connectDb();

  const [users, members] = await Promise.all([
    User.find({ clickUpMemberId: { $exists: true, $ne: null } })
      .select("clickUpMemberId name email accessTier image")
      .lean(),
    TeamMember.find({ clickUpMemberId: { $exists: true, $ne: null } })
      .select("clickUpMemberId key name avatarInitials hue weeklyHours active userId")
      .lean(),
  ]);

  /** @type {Map<string, Record<string, unknown>>} */
  const userByClickUpId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const memberByClickUpId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const memberByUserId = new Map();

  for (const u of users) {
    const id = String(u.clickUpMemberId ?? "").trim();
    if (id) userByClickUpId.set(id, /** @type {Record<string, unknown>} */ (u));
  }
  for (const m of members) {
    const id = String(m.clickUpMemberId ?? "").trim();
    const rec = /** @type {Record<string, unknown>} */ (m);
    if (id) memberByClickUpId.set(id, rec);
    if (m.userId) memberByUserId.set(String(m.userId), rec);
  }

  /** @type {Set<string>} */
  const usedTeamMemberKeys = new Set(members.map((m) => String(m.key ?? "")).filter(Boolean));

  /** @type {Array<ReturnType<typeof classifySyncRow>>} */
  const previewRows = [];

  for (const row of rows) {
    const clickUpMemberId = String(row.clickUpMemberId ?? "").trim();
    const mapped = csvRowToUserImport(row, { usedTeamMemberKeys });

    let existingUser = userByClickUpId.get(clickUpMemberId) ?? null;
    let existingMember = memberByClickUpId.get(clickUpMemberId) ?? null;

    if (!existingUser && mapped?.user.email) {
      const byEmail = await User.findOne({ email: mapped.user.email })
        .select("_id clickUpMemberId name email accessTier image")
        .lean();
      if (byEmail) {
        existingUser = /** @type {Record<string, unknown>} */ (byEmail);
        existingMember = memberByUserId.get(String(byEmail._id)) ?? existingMember;
      }
    }

    const proposed = proposedUserSnapshot(mapped, existingMember);
    const current = currentUserSnapshot(existingUser, existingMember);

    previewRows.push(
      classifySyncRow({
        id: clickUpMemberId,
        linkUrl: "",
        proposed,
        current,
        compareFields: COMPARE_FIELDS,
        skipped: !mapped,
      }),
    );
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceLabel: `List ${listId}`,
    listId,
    total: rows.length,
    counts: countSyncKinds(previewRows),
    rows: previewRows,
  };
}

/**
 * @param {string} clickUpMemberId
 * @param {NonNullable<ReturnType<typeof csvRowToUserImport>>} mapped
 * @param {Record<string, unknown> | null | undefined} existingMember
 */
async function upsertClickUpUser(clickUpMemberId, mapped, existingMember) {
  const teamMemberPayload = {
    ...mapped.teamMember,
    key:
      existingMember && typeof existingMember.key === "string" && existingMember.key.trim()
        ? String(existingMember.key).trim()
        : mapped.teamMember.key,
  };

  let userDoc = await User.findOne({
    $or: [{ email: mapped.user.email }, { clickUpMemberId }],
  });

  if (userDoc) {
    await User.updateOne(
      { _id: userDoc._id },
      {
        $set: {
          clickUpMemberId: mapped.user.clickUpMemberId,
          email: mapped.user.email,
          name: mapped.user.name,
          image: mapped.user.image,
          accessTier: mapped.user.accessTier,
          provisionedVia: mapped.user.provisionedVia,
        },
      },
    );
    userDoc = await User.findById(userDoc._id);
  } else {
    userDoc = await User.create(mapped.user);
  }

  if (!userDoc) return false;

  const payload = {
    ...teamMemberPayload,
    userId: userDoc._id,
  };

  const teamMemberDoc = await TeamMember.findOne({
    $or: [{ clickUpMemberId }, { key: teamMemberPayload.key }],
  });

  if (teamMemberDoc) {
    await TeamMember.updateOne({ _id: teamMemberDoc._id }, { $set: payload });
  } else {
    await TeamMember.create(payload);
  }

  return true;
}

/**
 * @param {string[]} clickUpMemberIds
 */
export async function applyClickUpUsersSync(clickUpMemberIds) {
  const ids = [...new Set(clickUpMemberIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (!ids.length) {
    return { ok: false, error: "Ingen brugere valgt", status: 400 };
  }

  const { rows, listId } = await fetchClickUpUserRows();
  const idSet = new Set(ids);
  const selectedRows = rows.filter((row) => idSet.has(String(row.clickUpMemberId ?? "").trim()));
  if (!selectedRows.length) {
    return { ok: false, error: "Valgte brugere findes ikke i ClickUp-preview", status: 400 };
  }

  await connectDb();

  const existingMembers = await TeamMember.find({}).select("key clickUpMemberId").lean();
  /** @type {Set<string>} */
  const usedTeamMemberKeys = new Set(
    existingMembers.map((m) => String(m.key ?? "")).filter(Boolean),
  );

  let imported = 0;
  let skipped = 0;
  /** @type {string[]} */
  const errors = [];

  for (const row of selectedRows) {
    const clickUpMemberId = String(row.clickUpMemberId ?? "").trim();
    const mapped = csvRowToUserImport(row, { usedTeamMemberKeys });
    if (!mapped) {
      skipped += 1;
      continue;
    }

    const existingMember = await TeamMember.findOne({
      $or: [{ clickUpMemberId }, { key: mapped.teamMember.key }],
    })
      .select("key clickUpMemberId")
      .lean();

    try {
      const ok = await upsertClickUpUser(
        clickUpMemberId,
        mapped,
        /** @type {Record<string, unknown> | null} */ (existingMember),
      );
      if (ok) imported += 1;
      else skipped += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${mapped.user.email}: ${msg}`);
    }
  }

  return {
    ok: true,
    imported,
    skipped,
    errors,
    total: selectedRows.length,
    listId,
    appliedIds: ids,
  };
}
