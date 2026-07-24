import { NextResponse } from "next/server";

import {
  fetchCalendarBundle,
  resolveCalendarMineAssigneeKey,
} from "@/lib/server/calendar-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const includeGoogle = req.nextUrl.searchParams.get("includeGoogle") !== "0";
  const timeMin = req.nextUrl.searchParams.get("timeMin") ?? "";
  const timeMax = req.nextUrl.searchParams.get("timeMax") ?? "";

  try {
    const mineAssigneeKey = await resolveCalendarMineAssigneeKey(authResult.session);
    const bundle = await fetchCalendarBundle({
      includeTest,
      mineAssigneeKey,
      includeGoogle,
      timeMin: timeMin || undefined,
      timeMax: timeMax || undefined,
      session: authResult.session,
    });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente kalender";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
