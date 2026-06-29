import { NextResponse } from "next/server";

import { clearMongoExceptUsers } from "@/lib/server/clear-mongo-except-users";
import { requireSession } from "@/lib/server/require-session";
import { seedDemoFromStatic } from "@/lib/server/seed-demo-from-static";

export async function POST() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  try {
    const cleared = await clearMongoExceptUsers();
    const seeded = await seedDemoFromStatic();
    return NextResponse.json({ ok: true, cleared, seeded });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke nulstille database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
