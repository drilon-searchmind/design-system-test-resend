import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { fetchNpsPortfolio } from "@/lib/server/nps-data";
import { resolveReportPeriodRequest, withReportPeriodRequest } from "@/lib/server/resolve-report-periods";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const resolved = resolveReportPeriodRequest(req.nextUrl.searchParams);

  try {
    const bundle = await fetchNpsPortfolio(
      withReportPeriodRequest(
        {
          includeTest,
          session: authResult.session,
        },
        resolved,
      ),
    );
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente NPS-data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
