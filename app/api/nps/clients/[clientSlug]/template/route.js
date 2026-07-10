import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { assignClientNpsTemplate } from "@/lib/server/nps-send-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientSlug: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientSlug: clientSlugEncoded } = await ctx.params;
  const clientSlug = decodeURIComponent(clientSlugEncoded ?? "");
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const templateKey =
      body?.templateKey === null || body?.templateKey === "" ? null
      : typeof body?.templateKey === "string" ? body.templateKey
      : null;

    const result = await assignClientNpsTemplate(clientSlug, { templateKey, includeTest });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke tildele skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
