import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { routes } from "@/config/routes";
import { env } from "@/lib/env";
import { saveGoogleCalendarToken, getGoogleCalendarStatus } from "@/lib/server/calendar-data";
import { exchangeGoogleCalendarCode } from "@/lib/server/google-calendar";
import { requireSession } from "@/lib/server/require-session";

const STATE_COOKIE = "gcal_oauth_state";

/**
 * @param {import('next/server').NextRequest} req
 * @param {string} query
 */
function redirectToCalendar(req, query) {
  const base = String(env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
  const path = routes.calendar.startsWith("/") ? routes.calendar : `/${routes.calendar}`;
  return NextResponse.redirect(`${base}${path}?${query}`);
}

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

  if (!code || !state || !stored || state !== stored) {
    return redirectToCalendar(req, "google=error");
  }

  try {
    const redirectUri = `${String(env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "")}/api/calendar/google/callback`;
    const tokens = await exchangeGoogleCalendarCode(code, redirectUri);
    if (tokens.refresh_token) {
      await saveGoogleCalendarToken(authResult.session, String(tokens.refresh_token));
      return redirectToCalendar(req, "google=connected");
    }

    // Google only returns refresh_token on first consent; repeat connects may omit it.
    const status = await getGoogleCalendarStatus(authResult.session);
    if (status.connected) {
      return redirectToCalendar(req, "google=connected");
    }

    return redirectToCalendar(req, "google=missing_refresh");
  } catch {
    return redirectToCalendar(req, "google=error");
  }
}
