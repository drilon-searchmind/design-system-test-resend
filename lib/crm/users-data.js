/**
 * Mock bureau-brugere til Brugerstyring — matcher `TEAM` + kommende Mongo `User`.
 */

import { TEAM } from "./static-data";

/** @typedef {'active' | 'invited' | 'suspended'} AgencyUserStatus */

/**
 * @param {string} name
 */
function slugEmail(name) {
  const norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zæøå\s-]/gi, "")
    .trim()
    .split(/\s+/);
  if (norm.length === 0) return "unknown@searchmind.agency.demo";
  return `${norm[0]}.${norm[norm.length - 1]}@searchmind.agency.demo`;
}

/** @type {Record<string, boolean>} */
const IS_ADMIN_FOR_MEMBER = (() => {
  /** @type {Record<string, boolean>} */
  const m = {};
  for (const t of TEAM) {
    m[t.id] = t.id === "lm";
  }
  return m;
})();

const LAST_SEEN_ISO = [
  "2026-05-08T14:22:00",
  "2026-05-07T09:41:00",
  "2026-05-08T11:03:00",
  "2026-05-06T16:18:00",
  "2026-05-05T08:55:00",
  "2026-05-08T07:12:00",
  "2026-05-07T13:29:00",
  "2026-05-04T10:00:00",
  "2026-05-08T15:01:00",
  "2026-05-03T12:44:00",
  "2026-05-07T17:20:00",
  "2026-05-06T09:33:00",
  "2026-05-02T14:10:00",
];

const FROM_TEAM = TEAM.map((member, i) => {
  const isAdmin = IS_ADMIN_FOR_MEMBER[member.id] ?? false;
  const mfa = isAdmin || i % 3 === 0;
  return {
    id: `u-${member.id}`,
    email: slugEmail(member.name),
    name: member.name,
    isAdmin,
    status: /** @type {const} */ ("active"),
    teamMemberId: member.id,
    mfaEnabled: mfa,
    lastSeenAt: LAST_SEEN_ISO[i % LAST_SEEN_ISO.length] ?? "2026-05-01T10:00:00",
    invitedAt: null,
    provisionedVia: /** @type {const} */ ("workspace_google_sso"),
  };
});

const EXTRA = [
  {
    id: "u-inv-freelance",
    email: "frida.hansen@partner.demo",
    name: "Frida Hansen",
    isAdmin: false,
    status: /** @type {const} */ ("invited"),
    teamMemberId: null,
    mfaEnabled: false,
    lastSeenAt: null,
    invitedAt: "2026-05-05",
    provisionedVia: /** @type {const} */ ("invite"),
  },
  {
    id: "u-inv-intern",
    email: "marcus.nielsen@skole.dk",
    name: "Marcus Nielsen",
    isAdmin: false,
    status: /** @type {const} */ ("invited"),
    teamMemberId: null,
    mfaEnabled: false,
    lastSeenAt: null,
    invitedAt: "2026-05-07",
    provisionedVia: /** @type {const} */ ("invite"),
  },
  {
    id: "u-sx-old",
    email: "viktor.past@ekstern.dk",
    name: "Viktor Past",
    isAdmin: false,
    status: /** @type {const} */ ("suspended"),
    teamMemberId: null,
    mfaEnabled: true,
    lastSeenAt: "2026-03-12T11:00:00",
    invitedAt: null,
    provisionedVia: /** @type {const} */ ("admin_seed"),
  },
];

export const AGENCY_USERS = [...FROM_TEAM, ...EXTRA];
