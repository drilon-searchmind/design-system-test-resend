import { ACCESS_TIERS } from "@/lib/constants/access-tiers";

/**
 * @typedef {{
 *   id: string;
 *   email: string;
 *   name: string;
 *   image: string;
 *   accessTier: string;
 *   isAdmin: boolean;
 *   provisionedVia: string;
 *   clickUpMemberId: string;
 *   status: string;
 *   mfaEnabled: boolean;
 *   lastSeenAt: string | null;
 *   invitedAt: string | null;
 *   teamMemberKey: string | null;
 *   roleTitle: string;
 *   departmentKey: string;
 *   disciplineKeys: string[];
 *   departmentLabel: string | null;
 *   avatarInitials: string;
 *   hue: number;
 *   weeklyHours: number;
 *   active: boolean;
 * }} UserDetailRow
 */

/**
 * @typedef {{
 *   email: string;
 *   name: string;
 *   image: string;
 *   accessTier: string;
 *   isAdmin: boolean;
 *   provisionedVia: string;
 *   clickUpMemberId: string;
 *   teamMemberKey: string;
 *   roleTitle: string;
 *   departmentKey: string;
 *   disciplineKeys: string[];
 *   avatarInitials: string;
 *   hue: number;
 *   weeklyHours: number;
 *   active: boolean;
 * }} UserEditDraft
 */

/** @param {UserDetailRow} user */
export function userDetailToEditDraft(user) {
  return {
    email: user.email ?? "",
    name: user.name ?? "",
    image: user.image ?? "",
    accessTier: user.accessTier ?? ACCESS_TIERS.INTERNAL_FULL,
    isAdmin: user.isAdmin === true,
    provisionedVia: user.provisionedVia ?? "workspace_google_sso",
    clickUpMemberId: user.clickUpMemberId ?? "",
    teamMemberKey: user.teamMemberKey ?? "",
    roleTitle: user.roleTitle ?? "",
    departmentKey: user.departmentKey ?? "",
    disciplineKeys: [...(user.disciplineKeys ?? [])],
    avatarInitials: user.avatarInitials ?? "",
    hue: typeof user.hue === "number" ? user.hue : 220,
    weeklyHours: typeof user.weeklyHours === "number" ? user.weeklyHours : 37,
    active: user.active !== false,
  };
}

/** @param {UserEditDraft} draft */
export function editDraftToPatch(draft) {
  return {
    email: draft.email.trim().toLowerCase(),
    name: draft.name.trim(),
    image: draft.image.trim() || null,
    accessTier: draft.accessTier,
    isAdmin: draft.isAdmin === true,
    provisionedVia: draft.provisionedVia,
    clickUpMemberId: draft.clickUpMemberId.trim() || null,
    teamMember: {
      key: draft.teamMemberKey.trim(),
      roleTitle: draft.roleTitle.trim() || null,
      departmentKey: draft.departmentKey.trim() || null,
      disciplineKeys: draft.disciplineKeys.map((k) => String(k).trim()).filter(Boolean),
      avatarInitials: draft.avatarInitials.trim().slice(0, 4) || null,
      hue: draft.hue,
      weeklyHours: draft.weeklyHours,
      active: draft.active,
    },
  };
}

/** @param {string} tier */
export function accessTierLabel(tier) {
  if (tier === ACCESS_TIERS.EXTERNAL_LIMITED) return "Ekstern (begrænset)";
  return "Intern (fuld adgang)";
}
