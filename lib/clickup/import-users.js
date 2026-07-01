import fs from "node:fs/promises";
import path from "node:path";

import { fetchListMembers } from "@/lib/clickup/api";
import { parseCsv } from "@/lib/clickup/csv";
import { mapClickUpListMember } from "@/lib/clickup/user-map";
import { ACCESS_TIERS } from "@/lib/constants/access-tiers";
import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";

/** @param {string | undefined} raw */
function parseOptionalNumber(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** @param {string | undefined} raw */
function parseBool(raw, defaultValue = true) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return defaultValue;
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return defaultValue;
}

/** @param {string | undefined} raw */
function normalizeAccessTier(raw) {
  const s = String(raw ?? "").trim();
  if (s === ACCESS_TIERS.EXTERNAL_LIMITED) return ACCESS_TIERS.EXTERNAL_LIMITED;
  return ACCESS_TIERS.INTERNAL_FULL;
}

/** @param {string | undefined} raw */
function normalizeProvisionedVia(raw) {
  const s = String(raw ?? "").trim();
  const allowed = new Set(["workspace_google_sso", "invite", "admin_seed", "migration"]);
  return allowed.has(s) ? s : "migration";
}

/**
 * Map export CSV row → Mongo User + TeamMember documents.
 * @param {Record<string, string>} row
 * @param {{ usedTeamMemberKeys?: Set<string> }} ctx
 */
export function csvRowToUserImport(row, ctx = {}) {
  const clickUpMemberId = String(row.clickUpMemberId ?? "").trim();
  const email = String(row.email ?? "")
    .trim()
    .toLowerCase();
  if (!clickUpMemberId || !email) return null;

  const name = String(row.name ?? "").trim() || email;
  const teamMemberKey = String(row.teamMemberKey ?? "").trim();
  if (!teamMemberKey) return null;

  const usedKeys = ctx.usedTeamMemberKeys ?? new Set();
  let key = teamMemberKey;
  if (usedKeys.has(key)) key = `${key}-${clickUpMemberId.slice(-4)}`;
  usedKeys.add(key);

  const hue = parseOptionalNumber(row.hue);

  return {
    user: {
      clickUpMemberId,
      email,
      name,
      image: String(row.image ?? "").trim() || undefined,
      accessTier: normalizeAccessTier(row.accessTier),
      provisionedVia: normalizeProvisionedVia(row.provisionedVia),
    },
    teamMember: {
      clickUpMemberId,
      key,
      name,
      avatarInitials: String(row.avatarInitials ?? "").trim().toUpperCase().slice(0, 4) || undefined,
      hue: hue != null ? Math.round(hue) : undefined,
      weeklyHours: parseOptionalNumber(row.weeklyHours) ?? 37,
      active: parseBool(row.active, true),
    },
  };
}

/**
 * @param {Record<string, string>[]} rows
 * @param {{ upsert?: boolean }} [opts]
 */
export async function importClickUpUsers(rows, opts = {}) {
  const upsert = opts.upsert !== false;
  await connectDb();

  /** @type {Set<string>} */
  const usedTeamMemberKeys = new Set();
  const existingMembers = await TeamMember.find({}).select("key").lean();
  for (const m of existingMembers) {
    if (m.key) usedTeamMemberKeys.add(String(m.key));
  }

  let imported = 0;
  let skipped = 0;
  /** @type {string[]} */
  const errors = [];

  for (const row of rows) {
    const mapped = csvRowToUserImport(row, { usedTeamMemberKeys });
    if (!mapped) {
      skipped += 1;
      continue;
    }

    try {
      let userDoc = await User.findOne({
        $or: [{ email: mapped.user.email }, { clickUpMemberId: mapped.user.clickUpMemberId }],
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
      } else if (upsert) {
        userDoc = await User.create(mapped.user);
      } else {
        userDoc = await User.create(mapped.user);
      }

      if (!userDoc) {
        skipped += 1;
        continue;
      }

      const teamMemberPayload = {
        ...mapped.teamMember,
        userId: userDoc._id,
      };

      let teamMemberDoc = await TeamMember.findOne({
        $or: [
          { clickUpMemberId: mapped.teamMember.clickUpMemberId },
          { key: mapped.teamMember.key },
        ],
      });

      if (teamMemberDoc) {
        await TeamMember.updateOne({ _id: teamMemberDoc._id }, { $set: teamMemberPayload });
      } else if (upsert) {
        await TeamMember.create(teamMemberPayload);
      } else {
        await TeamMember.create(teamMemberPayload);
      }

      imported += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${mapped.user.email}: ${msg}`);
    }
  }

  return { ok: true, imported, skipped, errors, total: rows.length };
}

/**
 * @param {string} [csvPath]
 */
export async function importClickUpUsersFromCsv(csvPath) {
  const file =
    csvPath ??
    (await findLatestUsersCsv(path.join(process.cwd(), "data", "clickup-export")));
  const text = await fs.readFile(file, "utf8");
  const rows = parseCsv(text);
  const result = await importClickUpUsers(rows);
  return { ...result, source: "csv", csvPath: file };
}

/** Re-fetch from ClickUp API and import (bypasses CSV parsing). */
export async function importClickUpUsersFromApi() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error("Missing CLICKUP_API_TOKEN");

  const listId = process.env.CLICKUP_USERS_LIST_ID ?? "210313781";
  const members = await fetchListMembers({ token, listId });
  /** @type {Set<string>} */
  const usedTeamMemberKeys = new Set();
  const rows = members.map((member) =>
    mapClickUpListMember(/** @type {Record<string, unknown>} */ (member), {
      listId,
      usedTeamMemberKeys,
    }),
  );
  const result = await importClickUpUsers(rows);
  return { ...result, source: "api", listId };
}

/** @param {string} dir */
async function findLatestUsersCsv(dir) {
  const entries = await fs.readdir(dir);
  const csvs = entries.filter((f) => f.startsWith("users-") && f.endsWith(".csv")).sort();
  if (!csvs.length) {
    throw new Error(`No users-*.csv found in ${dir}. Run npm run fetch-clickup-users first.`);
  }
  return path.join(dir, csvs[csvs.length - 1]);
}
