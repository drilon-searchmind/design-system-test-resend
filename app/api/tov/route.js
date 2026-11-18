import { NextResponse } from "next/server";

import { readIncludeTest } from "@/lib/server/include-test";
import { requireSession } from "@/lib/server/require-session";
import { listTovOverview } from "@/lib/server/tov-data";

/** Oversigt: alle kunder med Brand Core-status. */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  try {
    return NextResponse.json(await listTovOverview(readIncludeTest(req)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}
