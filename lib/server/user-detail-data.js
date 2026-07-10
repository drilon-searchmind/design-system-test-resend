import mongoose from "mongoose";

import { ACCESS_TIERS } from "@/lib/constants/access-tiers";
import { formatUserAccountId, parseUserAccountId } from "@/lib/crm/user-account-id";
import { deptMeta, deptShortLabels } from "@/lib/crm/dept-keys";
import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";

/**
 * @param {string} userAccountId Route param `u-{objectId}`
 */
export async function fetchUserDetailBundle(userAccountId) {
  const oid = parseUserAccountId(userAccountId);
  if (!oid) return { error: "Ugyldigt bruger-id", status: 400 };

  await connectDb();
  const userDoc = await User.findById(oid).lean();
  if (!userDoc) return { error: "Bruger ikke fundet", status: 404 };

  const memberDoc = await TeamMember.findOne({ userId: new mongoose.Types.ObjectId(oid) }).lean();

  const disciplineKeys = Array.isArray(memberDoc?.disciplineKeys)
    ? memberDoc.disciplineKeys.map(String).filter(Boolean)
    : memberDoc?.departmentKey
      ? [String(memberDoc.departmentKey)]
      : [];
  const departmentKey = memberDoc?.departmentKey ? String(memberDoc.departmentKey) : disciplineKeys[0] ?? "";
  const departmentLabel =
    disciplineKeys.length > 0 ?
      deptShortLabels(disciplineKeys).join(" · ")
    : departmentKey ?
      (deptMeta(departmentKey)?.short ?? departmentKey)
    : null;

  const tier = String(userDoc.accessTier ?? ACCESS_TIERS.INTERNAL_FULL);
  const isAdmin = userDoc.isAdmin === true;
  const updated = userDoc.updatedAt ? new Date(userDoc.updatedAt).toISOString() : null;

  /** @type {import('@/lib/crm/user-edit-utils').UserDetailRow} */
  const user = {
    id: formatUserAccountId(userDoc._id),
    email: String(userDoc.email ?? ""),
    name: String(userDoc.name ?? userDoc.email ?? "?"),
    image: String(userDoc.image ?? ""),
    accessTier: tier,
    isAdmin,
    provisionedVia: String(userDoc.provisionedVia ?? "workspace_google_sso"),
    clickUpMemberId: String(userDoc.clickUpMemberId ?? memberDoc?.clickUpMemberId ?? ""),
    status: "active",
    mfaEnabled: false,
    lastSeenAt: updated,
    invitedAt: null,
    teamMemberKey: memberDoc?.key ? String(memberDoc.key) : null,
    roleTitle: String(memberDoc?.roleTitle ?? ""),
    departmentKey,
    disciplineKeys,
    departmentLabel,
    avatarInitials: String(
      memberDoc?.avatarInitials ?? memberDoc?.name?.toString().slice(0, 2).toUpperCase() ?? "?",
    ),
    hue: typeof memberDoc?.hue === "number" ? memberDoc.hue : 220,
    weeklyHours: typeof memberDoc?.weeklyHours === "number" ? memberDoc.weeklyHours : 37,
    active: memberDoc?.active !== false,
  };

  return { source: "database", user };
}

/**
 * @param {string} userAccountId
 * @param {Record<string, unknown>} body
 */
export async function updateUserMongo(userAccountId, body) {
  const oid = parseUserAccountId(userAccountId);
  if (!oid) return { error: "Ugyldigt bruger-id", status: 400 };

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  if (!email) return { error: "Email er påkrævet", status: 400 };
  if (!name) return { error: "Navn er påkrævet", status: 400 };

  const accessTier = String(body.accessTier ?? ACCESS_TIERS.INTERNAL_FULL);
  if (!Object.values(ACCESS_TIERS).includes(/** @type {typeof ACCESS_TIERS[keyof typeof ACCESS_TIERS]} */ (accessTier))) {
    return { error: "Ugyldig adgangsniveau", status: 400 };
  }

  const provisionedViaRaw = String(body.provisionedVia ?? "workspace_google_sso");
  const provisionedVia = ["workspace_google_sso", "invite", "admin_seed", "migration"].includes(provisionedViaRaw)
    ? provisionedViaRaw
    : "workspace_google_sso";

  const imageRaw = body.image;
  const image = imageRaw === null || imageRaw === "" ? null : String(imageRaw).trim() || null;

  const clickUpRaw = body.clickUpMemberId;
  const clickUpMemberId =
    clickUpRaw === null || clickUpRaw === "" ? null : String(clickUpRaw).trim() || null;

  const isAdmin = body.isAdmin === true;

  const teamRaw = body.teamMember;
  const teamPatch =
    teamRaw && typeof teamRaw === "object" && !Array.isArray(teamRaw) ?
      /** @type {Record<string, unknown>} */ (teamRaw)
    : null;

  await connectDb();

  const userId = new mongoose.Types.ObjectId(oid);
  const existingUser = await User.findById(userId).lean();
  if (!existingUser) return { error: "Bruger ikke fundet", status: 404 };

  const emailConflict = await User.findOne({ email, _id: { $ne: userId } }).select("_id").lean();
  if (emailConflict) return { error: "Email er allerede i brug", status: 409 };

  if (clickUpMemberId) {
    const cuConflict = await User.findOne({ clickUpMemberId, _id: { $ne: userId } }).select("_id").lean();
    if (cuConflict) return { error: "ClickUp member-id er allerede i brug", status: 409 };
  }

  /** @type {Record<string, unknown>} */
  const userSet = { email, name, accessTier, isAdmin, provisionedVia, image, clickUpMemberId };

  await User.updateOne({ _id: userId }, { $set: userSet });

  if (teamPatch) {
    const memberKey = String(teamPatch.key ?? "").trim();
    const roleTitle = String(teamPatch.roleTitle ?? "").trim() || null;
    const departmentKey = String(teamPatch.departmentKey ?? "").trim() || null;
    const disciplineKeys = Array.isArray(teamPatch.disciplineKeys)
      ? teamPatch.disciplineKeys.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const avatarInitials = String(teamPatch.avatarInitials ?? "").trim().slice(0, 4) || null;
    const hueRaw = Number(teamPatch.hue);
    const hue = Number.isFinite(hueRaw) ? Math.min(360, Math.max(0, hueRaw)) : 220;
    const weeklyRaw = Number(teamPatch.weeklyHours);
    const weeklyHours = Number.isFinite(weeklyRaw) && weeklyRaw > 0 ? weeklyRaw : 37;
    const active = teamPatch.active !== false;

    let memberDoc = await TeamMember.findOne({ userId }).lean();

    if (memberKey) {
      const keyConflict = await TeamMember.findOne({
        key: memberKey,
        ...(memberDoc?._id ? { _id: { $ne: memberDoc._id } } : {}),
      })
        .select("_id")
        .lean();
      if (keyConflict) return { error: "Roster-nøgle er allerede i brug", status: 409 };
    }

    if (clickUpMemberId && memberDoc?._id) {
      const cuMemberConflict = await TeamMember.findOne({
        clickUpMemberId,
        _id: { $ne: memberDoc._id },
      })
        .select("_id")
        .lean();
      if (cuMemberConflict) return { error: "ClickUp member-id er allerede i brug på roster", status: 409 };
    }

    const memberSet = {
      name,
      roleTitle,
      departmentKey,
      disciplineKeys: disciplineKeys.length ? disciplineKeys : departmentKey ? [departmentKey] : [],
      avatarInitials,
      hue,
      weeklyHours,
      active,
      clickUpMemberId,
    };
    if (memberKey) memberSet.key = memberKey;

    if (memberDoc) {
      await TeamMember.updateOne({ _id: memberDoc._id }, { $set: memberSet });
    } else if (memberKey) {
      await TeamMember.create({
        ...memberSet,
        key: memberKey,
        userId,
      });
    }
  }

  return fetchUserDetailBundle(userAccountId);
}
