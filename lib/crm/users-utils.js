import { AGENCY_USERS } from "./users-data";

/** @param {boolean | undefined | null} isAdmin */
export function userRoleLabel(isAdmin) {
  return isAdmin ? "Admin" : "Standard";
}

/** @param {string} id */
export function getAgencyUserById(id) {
  return AGENCY_USERS.find((u) => u.id === id) ?? null;
}

export function usersAgencyStatsFromList(list) {
  const active = list.filter((u) => u.status === "active").length;
  const invited = list.filter((u) => u.status === "invited").length;
  const suspended = list.filter((u) => u.status === "suspended").length;
  const adminish = list.filter((u) => u.status === "active" && u.isAdmin === true).length;
  const withMfa = list.filter((u) => u.status === "active" && u.mfaEnabled).length;
  const mfaPct = active > 0 ? Math.round((withMfa / active) * 100) : 0;

  return {
    total: list.length,
    active,
    invited,
    suspended,
    adminish,
    withMfa,
    mfaPct,
  };
}

export function usersAgencyStats() {
  return usersAgencyStatsFromList(AGENCY_USERS);
}
