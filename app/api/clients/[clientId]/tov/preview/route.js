import { NextResponse } from "next/server";

import { readIncludeTest } from "@/lib/server/include-test";
import { requireSession } from "@/lib/server/require-session";
import { generatePreview } from "@/lib/server/tov-data";

/** (Gen)generér og gem HTML-eksemplet. Body: { model? } */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await generatePreview(clientId, readIncludeTest(req), body ?? {});
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}
