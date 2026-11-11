import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { deleteUpsell } from "@/lib/server/upsell-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Slet opsalg.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string; upsellId: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId, upsellId } = await ctx.params;
  const includeTest = readIncludeTest(req);
  try {
    const result = await deleteUpsell(clientId, includeTest, upsellId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette opsalg";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}