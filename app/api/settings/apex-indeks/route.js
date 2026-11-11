import { NextResponse } from "next/server";

import { fetchApexIndeksStatus, syncApexIndeks } from "@/lib/server/apex-indeks-sync";
import { requireAdmin } from "@/lib/server/require-admin";

/** Status for Apex Indeks-synkronisering (kun admin). */
export async function GET() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  try {
    return NextResponse.json(await fetchApexIndeksStatus());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Hent Indeks fra Apex nu (kun admin). */
export async function POST() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  const result = await syncApexIndeks();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json(result);
}