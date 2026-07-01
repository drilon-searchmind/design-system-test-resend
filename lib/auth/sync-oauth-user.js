import { normalizeEmail } from "@/lib/auth/workspace-sso";
import { ACCESS_TIERS } from "@/lib/constants/access-tiers";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";

/**
 * Link a Google OAuth sign-in to an existing Mongo `User` (by email).
 * Updates googleSubject / profile fields — does not create a duplicate when
 * the user was pre-provisioned (e.g. ClickUp migration).
 *
 * @param {{ email?: string | null; name?: string | null; image?: string | null; googleSubject?: string | null }} input
 * @returns {Promise<string | null>} Mongo User._id as string
 */
export async function syncGoogleOAuthUser(input) {
  const email = normalizeEmail(input.email);
  const googleSubject = String(input.googleSubject ?? "").trim();
  if (!email || !googleSubject) return null;

  await connectDb();

  const existing = await User.findOne({ email }).lean();
  if (!existing) return null;

  /** @type {Record<string, unknown>} */
  const $set = {
    googleSubject,
    emailVerifiedAt: new Date(),
  };
  if (input.name) $set.name = String(input.name).trim();
  if (input.image) $set.image = String(input.image).trim();

  await User.updateOne({ _id: existing._id }, { $set });

  return String(existing._id);
}

/**
 * @param {import('mongoose').Document | Record<string, unknown>} doc
 */
export function accessTierFromUserDoc(doc) {
  const tier = String(doc?.accessTier ?? "");
  if (tier === ACCESS_TIERS.EXTERNAL_LIMITED) return ACCESS_TIERS.EXTERNAL_LIMITED;
  return ACCESS_TIERS.INTERNAL_FULL;
}
