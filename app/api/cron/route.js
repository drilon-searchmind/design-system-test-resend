import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { syncApexIndeks } from "@/lib/server/apex-indeks-sync";
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
    // Apex Indeks: fejl her må ikke vælte resten af cron-jobbet.
    const apexIndeks = await syncApexIndeks().catch((err) => ({
      ok: false,
      error: err instanceof Error ? err.message : "Apex Indeks-sync fejlede",
    }));
    return NextResponse.json({ ok: true, nps, apexIndeks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
