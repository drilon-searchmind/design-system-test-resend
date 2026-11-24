import { NextResponse } from "next/server";

import { sessionUserIsAdmin } from "@/lib/auth/session-admin";
import { readIncludeTest } from "@/lib/server/include-test";
import { fetchClientDetailBundle } from "@/lib/server/client-detail-data";
import { requireSession } from "@/lib/server/require-session";
import { resolveReportPeriodRequest, withReportPeriodRequest } from "@/lib/server/resolve-report-periods";

/**
 * Letvægt endpoint til 12-måneders KPI-historik (hover i kundelisten).
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);
  const resolved = resolveReportPeriodRequest(req.nextUrl.searchParams);

  try {
    const bundle = await fetchClientDetailBundle(
      withReportPeriodRequest(
        { clientKey: clientId, includeTest, isAdmin: await sessionUserIsAdmin(authResult.session) },
        resolved,
      ),
    );
    if (bundle?.error) {
      return NextResponse.json({ error: bundle.error }, { status: bundle.status ?? 400 });
    }
    const t = bundle.trends ?? {};
    return NextResponse.json({
      mrr: t.mrr ?? [],
      nps: t.nps ?? [],
      margin: t.margin ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente historik" },
      { status: 500 },
    );
  }
}
