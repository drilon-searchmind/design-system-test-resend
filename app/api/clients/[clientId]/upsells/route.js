import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { createUpsell } from "@/lib/server/upsell-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Opret opsalg på en kunde.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);
  try {
    const body = await req.json();
    const result = await createUpsell(clientId, includeTest, body, {
      by: authResult.session.user?.name ?? authResult.session.user?.email ?? undefined,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette opsalg";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}