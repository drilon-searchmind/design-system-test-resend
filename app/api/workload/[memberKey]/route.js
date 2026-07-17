import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { fetchWorkloadMemberDetail } from "@/lib/server/workload-data";
import { resolveReportPeriodRequest, withReportPeriodRequest } from "@/lib/server/resolve-report-periods";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ memberKey: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { memberKey: memberKeyEncoded } = await ctx.params;
  const memberKey = decodeURIComponent(memberKeyEncoded ?? "");

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const resolved = resolveReportPeriodRequest(req.nextUrl.searchParams);

  try {
    const bundle = await fetchWorkloadMemberDetail(
      withReportPeriodRequest(
        {
          memberKey,
          includeTest,
          session: authResult.session,
        },
        resolved,
      ),
    );

    if (!bundle) {
      return NextResponse.json({ error: "Medarbejder ikke fundet" }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente workload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
