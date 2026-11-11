import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { fetchClientGroupDetailBundle, updateClientGroupMongo } from "@/lib/server/client-groups-data";
import { requireSession } from "@/lib/server/require-session";
import { resolveReportPeriodRequest, withReportPeriodRequest } from "@/lib/server/resolve-report-periods";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ cvr: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { cvr } = await ctx.params;
  const includeTest = readIncludeTest(req);
  const resolved = resolveReportPeriodRequest(req.nextUrl.searchParams);

  try {
    const bundle = await fetchClientGroupDetailBundle(
      withReportPeriodRequest({ cvr, includeTest }, resolved),
    );
    if (bundle?.error) {
      return NextResponse.json(
        { error: bundle.error, redirectSlug: bundle.redirectSlug },
        { status: bundle.status ?? 400 },
      );
    }
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente kundegruppe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ cvr: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { cvr } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    const result = await updateClientGroupMongo(cvr, includeTest, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere kundegruppe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
