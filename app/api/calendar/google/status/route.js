import { NextResponse } from "next/server";

import { disconnectGoogleCalendar, getGoogleCalendarStatus } from "@/lib/server/calendar-data";
import { requireSession } from "@/lib/server/require-session";

export async function GET() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  try {
    const status = await getGoogleCalendarStatus(authResult.session);
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  try {
    await disconnectGoogleCalendar(authResult.session);
    return NextResponse.json({ connected: false, connectedAt: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke afbryde forbindelse";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
