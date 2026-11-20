import mongoose from "mongoose";

import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { accessTierFromUserDoc } from "@/lib/auth/sync-oauth-user";
import { normalizeEmail } from "@/lib/auth/workspace-sso";
import { ACCESS_TIERS } from "@/lib/constants/access-tiers";

/**
 * Who may use the MCP server. For now: only this allowlist (full read + write).
 * Override with MCP_ALLOWED_EMAILS (comma separated) on Railway.
 * Everyone else is blocked until the admin-role rule is decided.
 */
const DEFAULT_ALLOWED = ["dbr@searchmind.dk", "brian@searchmind.dk", "kh@searchmind.dk"];

export function mcpAllowedEmails() {
  const raw = process.env.MCP_ALLOWED_EMAILS;
  const list = raw
    ? raw
        .split(",")
        .map((e) => normalizeEmail(e))
        .filter(Boolean)
    : DEFAULT_ALLOWED;
  return new Set(list);
}

/** @param {string | null | undefined} email */
export function isMcpEmailAllowed(email) {
  const e = normalizeEmail(email ?? "");
  return Boolean(e) && mcpAllowedEmails().has(e);
}

/**
 * Role-based access, built but OFF by default.
 * Turn on in Railway with MCP_ADMIN_ACCESS=1: then every user who is admin
 * in the CRM (User.isAdmin) may use the MCP with admin rights (read + write).
 */
export function mcpAdminAccessEnabled() {
  const v = (process.env.MCP_ADMIN_ACCESS ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/**
 * Single access decision used by authorize, token and the MCP endpoint.
 * 1) allowlist -> allowed; 2) else, if role access is enabled, CRM admins -> allowed.
 * @param {string | null | undefined} email
 * @returns {Promise<boolean>}
 */
export async function canUseMcp(email) {
  if (isMcpEmailAllowed(email)) return true;
  if (!mcpAdminAccessEnabled()) return false;
  const e = normalizeEmail(email ?? "");
  if (!e) return false;
  try {
    await connectDb();
    const doc = await User.findOne({ email: e }).select("isAdmin").lean();
    return doc?.isAdmin === true;
  } catch {
    return false;
  }
}

/**
 * Build the session object the existing route handlers expect.
 * Allowlisted users act as full admins.
 * @param {string} email
 */
export async function buildMcpSession(email) {
  const e = normalizeEmail(email);
  let doc = null;
  try {
    await connectDb();
    doc = await User.findOne({ email: e }).select("_id name email image accessTier isAdmin").lean();
  } catch {
    doc = null;
  }
  const id = doc?._id && mongoose.Types.ObjectId.isValid(String(doc._id)) ? String(doc._id) : `mcp:${e}`;
  return {
    user: {
      id,
      email: e,
      name: String(doc?.name ?? e),
      image: doc?.image ? String(doc.image) : null,
      accessTier: doc ? accessTierFromUserDoc(doc) : ACCESS_TIERS.INTERNAL_FULL,
      isAdmin: true,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}
