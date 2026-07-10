import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/require-admin";
import { fetchUsersAdminPortfolio } from "@/lib/server/users-admin-data";

export async function GET() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const bundle = await fetchUsersAdminPortfolio({ session: authResult.session });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente brugere";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
