import { NextResponse } from "next/server";

import {
  fetchAgencySettings,
  patchAgencySettings,
  resetAgencySettings,
} from "@/lib/server/agency-settings-data";
import { requireAdmin } from "@/lib/server/require-admin";
import { requireSession } from "@/lib/server/require-session";

/** Hent justerbare nøgletal-parametre (alle indloggede). */
export async function GET() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  try {
    return NextResponse.json({ settings: await fetchAgencySettings() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente indstillinger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Gem nøgletal-parametre (kun admin).
 * @param {import('next/server').NextRequest} req
 */
export async function PATCH(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  try {
    const body = await req.json();
    const result = await patchAgencySettings(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke gemme indstillinger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Nulstil til standardværdier (kun admin). */
export async function DELETE() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;
  try {
    return NextResponse.json(await resetAgencySettings());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke nulstille";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
