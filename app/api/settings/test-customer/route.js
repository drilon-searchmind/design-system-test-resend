import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/require-admin";
import { requireSession } from "@/lib/server/require-session";
import {
  getTestCustomerStatus,
  removeTestCustomer,
  seedTestCustomer,
} from "@/lib/server/seed-test-customer";

/** Findes testkunden, og hvad indeholder den? */
export async function GET() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  try {
    return NextResponse.json(await getTestCustomerStatus());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Opret/genopret (`{ action: "create" }`) eller slet (`{ action: "remove" }`) testkunden — kun admin.
 * @param {Request} req
 */
export async function POST(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.action === "remove") {
      await removeTestCustomer();
      return NextResponse.json(await getTestCustomerStatus());
    }
    const result = await seedTestCustomer();
    return NextResponse.json(result.status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette testkunden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
