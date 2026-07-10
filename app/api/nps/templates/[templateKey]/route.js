import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { patchNpsTemplate } from "@/lib/server/nps-send-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateKey: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateKey: templateKeyEncoded } = await ctx.params;
  const templateKey = decodeURIComponent(templateKeyEncoded ?? "");
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await patchNpsTemplate(templateKey, {
      isDefault: body?.isDefault === true ? true : undefined,
      name: typeof body?.name === "string" ? body.name : undefined,
      subject: typeof body?.subject === "string" ? body.subject : undefined,
      bodyMd: typeof body?.bodyMd === "string" ? body.bodyMd : undefined,
      includeTest,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
