import { NextResponse } from "next/server";

import { markNotificationRead } from "@/lib/server/notifications-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ notificationId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { notificationId } = await ctx.params;

  try {
    const res = await markNotificationRead(notificationId, authResult.session);
    if (res && typeof res === "object" && "error" in res && typeof res.error === "string") {
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere notifikation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
