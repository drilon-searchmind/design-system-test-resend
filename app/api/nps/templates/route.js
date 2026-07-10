import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { createNpsTemplate } from "@/lib/server/nps-send-data";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await createNpsTemplate({
      key: typeof body?.key === "string" ? body.key : "",
      name: typeof body?.name === "string" ? body.name : "",
      subject: typeof body?.subject === "string" ? body.subject : "",
      bodyMd: typeof body?.bodyMd === "string" ? body.bodyMd : "",
      isDefault: Boolean(body?.isDefault),
      includeTest,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
