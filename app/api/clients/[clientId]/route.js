import { NextResponse } from "next/server";

import { fetchClientDetailBundle } from "@/lib/server/client-detail-data";
import { updateClientMongo } from "@/lib/server/client-update-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));

  try {
    const bundle = await fetchClientDetailBundle({
      clientKey: clientId,
      includeTest,
      year: Number.isFinite(year) ? year : undefined,
      month: Number.isFinite(month) ? month : undefined,
    });

    if (bundle?.error) {
      return NextResponse.json({ error: bundle.error }, { status: bundle.status ?? 400 });
    }
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente kundeprofil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await updateClientMongo(clientId, includeTest, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere kunde";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
