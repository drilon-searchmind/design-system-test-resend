import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { routes } from "@/config/routes";
import { env } from "@/lib/env";
import { saveGoogleCalendarToken } from "@/lib/server/calendar-data";
import { exchangeGoogleCalendarCode } from "@/lib/server/google-calendar";
import { requireSession } from "@/lib/server/require-session";

const STATE_COOKIE = "gcal_oauth_state";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const store = await cookies();
  const stored = store.get(STATE_COOKIE)?.value ?? "";
  store.delete(STATE_COOKIE);

  const calendarUrl = `${routes.calendar}`;

  if (!code || !state || !stored || state !== stored) {
    return NextResponse.redirect(`${calendarUrl}?google=error`);
  }

  try {
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`;
    const tokens = await exchangeGoogleCalendarCode(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${calendarUrl}?google=missing_refresh`);
    }
    await saveGoogleCalendarToken(authResult.session, String(tokens.refresh_token));
    return NextResponse.redirect(`${calendarUrl}?google=connected`);
  } catch {
    return NextResponse.redirect(`${calendarUrl}?google=error`);
  }
}
