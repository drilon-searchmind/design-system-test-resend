import { env } from "@/lib/env";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/**
 * @param {string} redirectUri
 * @param {string} state
 */
export function buildGoogleCalendarAuthUrl(redirectUri, state) {
  const clientId = env.SSO_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google OAuth er ikke konfigureret");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * @param {string} code
 * @param {string} redirectUri
 */
export async function exchangeGoogleCalendarCode(code, redirectUri) {
  const clientId = env.SSO_GOOGLE_CLIENT_ID;
  const clientSecret = env.SSO_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth er ikke konfigureret");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error_description === "string" ? data.error_description : "Token exchange failed");
  }
  return data;
}

/**
 * @param {string} refreshToken
 */
export async function refreshGoogleCalendarAccessToken(refreshToken) {
  const clientId = env.SSO_GOOGLE_CLIENT_ID;
  const clientSecret = env.SSO_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth er ikke konfigureret");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error_description === "string" ? data.error_description : "Token refresh failed");
  }
  return /** @type {{ access_token: string; expires_in?: number }} */ (data);
}

/**
 * @param {string} accessToken
 * @param {Date} timeMin
 * @param {Date} timeMax
 */
export async function fetchGoogleCalendarEvents(accessToken, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error?.message === "string" ? data.error.message : "Kunne ikke hente Google Calendar");
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((ev) => {
    const startRaw = ev.start?.dateTime ?? ev.start?.date ?? "";
    const endRaw = ev.end?.dateTime ?? ev.end?.date ?? "";
    const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
    return {
      id: String(ev.id ?? ""),
      title: String(ev.summary ?? "(Ingen titel)"),
      start: String(startRaw),
      end: String(endRaw),
      allDay,
      location: typeof ev.location === "string" ? ev.location : "",
      htmlLink: typeof ev.htmlLink === "string" ? ev.htmlLink : "",
    };
  });
}

/**
 * @param {string} refreshToken
 * @param {Date} timeMin
 * @param {Date} timeMax
 */
export async function fetchGoogleCalendarEventsWithRefresh(refreshToken, timeMin, timeMax) {
  const tokens = await refreshGoogleCalendarAccessToken(refreshToken);
  return fetchGoogleCalendarEvents(tokens.access_token, timeMin, timeMax);
}
