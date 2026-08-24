import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { buildGoogleCalendarAuthUrl } from "@/lib/server/google-calendar";
import { requireSession } from "@/lib/server/require-session";

const STATE_COOKIE = "gcal_oauth_state";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  if (!env.SSO_GOOGLE_CLIENT_ID || !env.SSO_GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth er ikke konfigureret" }, { status: 503 });
  }

  const state = randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });

  const appBase = String(env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
  const redirectUri = `${appBase}/api/calendar/google/callback`;
  const url = buildGoogleCalendarAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
