import { NextResponse } from "next/server";

import {
  fetchNotificationsForSession,
  markAllNotificationsRead,
} from "@/lib/server/notifications-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : undefined;

  try {
    const bundle = await fetchNotificationsForSession(authResult.session, {
      includeTest,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente notifikationer";
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

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  if (body.markAllRead === true) {
    try {
      const markResult = await markAllNotificationsRead(authResult.session, { includeTest });
      if (markResult && typeof markResult === "object" && "error" in markResult) {
        return NextResponse.json({ error: markResult.error }, { status: markResult.status ?? 401 });
      }
      const bundle = await fetchNotificationsForSession(authResult.session, { includeTest });
      return NextResponse.json(bundle);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke opdatere notifikationer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
}
