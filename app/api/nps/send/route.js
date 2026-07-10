import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { sendNpsEmailToClient } from "@/lib/server/nps-send-data";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const clientSlug = typeof body?.clientSlug === "string" ? body.clientSlug : "";
    const templateKey = typeof body?.templateKey === "string" ? body.templateKey : undefined;
    const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail : undefined;

    const result = await sendNpsEmailToClient({
      clientSlug,
      templateKey,
      contactEmail,
      includeTest,
      session: authResult.session,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke sende NPS-e-mail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
