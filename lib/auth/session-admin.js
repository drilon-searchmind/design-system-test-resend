import mongoose from "mongoose";

import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { getMcpAuth } from "@/lib/mcp/auth-context";

/**
 * Resolve workspace admin from Mongo when possible; falls back to session flag.
 *
 * @param {import('next-auth').Session | null | undefined} session
 */
export async function sessionUserIsAdmin(session) {
  const mcp = getMcpAuth();
  if (mcp) return mcp.isAdmin === true;
  const id = typeof session?.user?.id === "string" ? session.user.id.trim() : "";
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    await connectDb();
    const doc = await User.findById(id).select("isAdmin").lean();
    return doc?.isAdmin === true;
  }
  return session?.user?.isAdmin === true;
}
