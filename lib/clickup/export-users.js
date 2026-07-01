import fs from "node:fs/promises";
import path from "node:path";

import { fetchListMembers } from "@/lib/clickup/api";
import { rowsToCsv } from "@/lib/clickup/csv";
import { mapClickUpListMember, USER_CSV_COLUMNS } from "@/lib/clickup/user-map";

const DEFAULT_LIST_ID = "210313781";

/**
 * Fetch ClickUp list members and write a review CSV.
 * @param {{ token?: string; listId?: string; outDir?: string }} [opts]
 */
export async function exportClickUpUsersCsv(opts = {}) {
  const token = opts.token ?? process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error("Missing CLICKUP_API_TOKEN in environment");
  }

  const listId = opts.listId ?? process.env.CLICKUP_USERS_LIST_ID ?? DEFAULT_LIST_ID;
  const outDir = opts.outDir ?? path.join(process.cwd(), "data", "clickup-export");

  const members = await fetchListMembers({ token, listId });
  /** @type {Set<string>} */
  const usedTeamMemberKeys = new Set();

  const rows = members.map((member) =>
    mapClickUpListMember(/** @type {Record<string, unknown>} */ (member), {
      listId,
      usedTeamMemberKeys,
    }),
  );

  rows.sort((a, b) => a.name.localeCompare(b.name, "da"));

  const stamp = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(outDir, `users-${stamp}.csv`);
  const metaPath = path.join(outDir, `users-${stamp}.json`);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(csvPath, rowsToCsv(USER_CSV_COLUMNS, rows), "utf8");
  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        listId,
        memberCount: rows.length,
        columns: USER_CSV_COLUMNS,
        apiDoc: "https://developer.clickup.com/reference/getlistmembers",
        targets: {
          user: "lib/db/models/user.js",
          teamMember: "lib/db/models/team-member.js",
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    ok: true,
    listId,
    memberCount: rows.length,
    csvPath,
    metaPath,
  };
}
