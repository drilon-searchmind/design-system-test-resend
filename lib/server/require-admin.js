import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { sessionUserIsAdmin } from "@/lib/auth/session-admin";
import { requireSession } from "@/lib/server/require-session";

/** @returns {Promise<{ session: import('next-auth').Session } | { response: NextResponse }>} */
export async function requireAdmin() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult;

  const isAdmin = await sessionUserIsAdmin(authResult.session);
  if (!isAdmin) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return authResult;
}

/** Redirect non-admins away from admin-only pages. */
export async function requireAdminPage() {
  const authResult = await requireSession();
  if ("response" in authResult) {
    redirect("/login");
  }

  const isAdmin = await sessionUserIsAdmin(authResult.session);
  if (!isAdmin) {
    redirect("/pulse");
  }

  return authResult.session;
}
