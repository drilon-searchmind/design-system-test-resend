import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processNpsScheduledSends } from "@/lib/server/nps-scheduled-send";

/**
 * Vercel Cron or external scheduler — protect with CRON_SECRET.
 * @param {import("next/server").NextRequest} request
 */
export async function GET(request) {
  const auth = request.headers.get("authorization");
  const secret = env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Set CRON_SECRET in production" }, { status: 501 });
  }

  try {
    const nps = await processNpsScheduledSends();
    return NextResponse.json({ ok: true, nps });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
