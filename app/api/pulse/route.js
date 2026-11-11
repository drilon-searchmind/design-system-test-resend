import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { fetchPulseBundle } from "@/lib/server/pulse-data";
import { requireSession } from "@/lib/server/require-session";
import { resolveReportPeriodRequest, withReportPeriodRequest } from "@/lib/server/resolve-report-periods";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);
  const resolved = resolveReportPeriodRequest(req.nextUrl.searchParams);

  try {
    const bundle = await fetchPulseBundle(withReportPeriodRequest({ includeTest }, resolved));
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente Pulse-data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
