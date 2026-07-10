import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { fetchNpsSettings, patchNpsSettings } from "@/lib/server/nps-settings-data";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const settings = await fetchNpsSettings({ includeTest });
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente NPS-indstillinger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 */
export async function PATCH(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await patchNpsSettings({
      includeTest,
      autoSendEnabled:
        typeof body?.autoSendEnabled === "boolean" ? body.autoSendEnabled : undefined,
      sendTimeLocal: typeof body?.sendTimeLocal === "string" ? body.sendTimeLocal : undefined,
      sendDates: Array.isArray(body?.sendDates) ? body.sendDates : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere NPS-indstillinger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
