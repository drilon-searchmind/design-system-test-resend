/** @param {string | undefined | null} hex */
export function hexColorToHue(hex) {
  const raw = String(hex ?? "").trim();
  const m = /^#?([a-f0-9]{6})$/i.exec(raw);
  if (!m) return "";

  const r = Number.parseInt(m[1].slice(0, 2), 16) / 255;
  const g = Number.parseInt(m[1].slice(2, 4), 16) / 255;
  const b = Number.parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return "0";

  const d = max - min;
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return String(Math.round((h / 6) * 360));
}

/** @param {string} name */
function initialsFromName(name) {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 4);
  }
  return String(name).trim().slice(0, 2).toUpperCase() || "?";
}

/**
 * @param {string} name
 * @param {string} email
 * @param {string | number} clickUpMemberId
 * @param {Set<string>} usedKeys
 */
export function suggestTeamMemberKey(name, email, clickUpMemberId, usedKeys) {
  const local = String(email ?? "")
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initialsKey = parts
    .map((p) => p[0] ?? "")
    .join("")
    .toLowerCase()
    .slice(0, 4);
  const idSuffix = String(clickUpMemberId).slice(-4);

  /** @type {string[]} */
  const candidates = [
    local?.slice(0, 10) ?? "",
    initialsKey,
    `${initialsKey}${idSuffix}`,
    `cu${idSuffix}`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!usedKeys.has(candidate)) {
      usedKeys.add(candidate);
      return candidate;
    }
  }

  const fallback = `cu-${clickUpMemberId}`;
  usedKeys.add(fallback);
  return fallback;
}

/** @param {unknown} value */
function boolLabel(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

/**
 * Map ClickUp list member → flat CSV row (Agency OS User + TeamMember targets).
 * @param {Record<string, unknown>} member
 * @param {{ listId: string; usedTeamMemberKeys?: Set<string> }} ctx
 */
export function mapClickUpListMember(member, ctx) {
  const clickUpMemberId = String(member.id ?? "").trim();
  const username = String(member.username ?? "").trim();
  const email = String(member.email ?? "")
    .trim()
    .toLowerCase();
  const colorHex = String(member.color ?? "").trim();
  const initials =
    String(member.initials ?? "").trim().toUpperCase() || initialsFromName(username);
  const profilePicture = String(member.profilePicture ?? "").trim();
  const profileInfo =
    member.profileInfo && typeof member.profileInfo === "object" ?
      /** @type {Record<string, unknown>} */ (member.profileInfo)
    : {};

  const usedKeys = ctx.usedTeamMemberKeys ?? new Set();
  const teamMemberKey =
    clickUpMemberId ?
      suggestTeamMemberKey(username, email, clickUpMemberId, usedKeys)
    : "";

  return {
    clickUpMemberId,
    clickUpListId: ctx.listId,
    name: username,
    email,
    teamMemberKey,
    avatarInitials: initials,
    image: profilePicture,
    colorHex,
    hue: hexColorToHue(colorHex),
    accessTier: "internal_full",
    provisionedVia: "migration",
    active: "true",
    weeklyHours: "37",
    profileDisplay: boolLabel(profileInfo.display_profile),
    verifiedAmbassador: boolLabel(profileInfo.verified_ambassador),
    verifiedConsultant: boolLabel(profileInfo.verified_consultant),
    topTierUser: boolLabel(profileInfo.top_tier_user),
    aiExpert: boolLabel(profileInfo.ai_expert),
  };
}

export const USER_CSV_COLUMNS = [
  "clickUpMemberId",
  "clickUpListId",
  "name",
  "email",
  "teamMemberKey",
  "avatarInitials",
  "image",
  "colorHex",
  "hue",
  "accessTier",
  "provisionedVia",
  "active",
  "weeklyHours",
  "profileDisplay",
  "verifiedAmbassador",
  "verifiedConsultant",
  "topTierUser",
  "aiExpert",
];
