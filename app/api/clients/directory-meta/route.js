import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { fetchClientDirectoryMeta } from "@/lib/server/client-activity-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Seneste aktivitet + primært domæne pr. kunde (slug) til kundelisten.
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  try {
    const meta = await fetchClientDirectoryMeta({ includeTest: readIncludeTest(req) });
    return NextResponse.json(meta);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente kundeaktivitet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
