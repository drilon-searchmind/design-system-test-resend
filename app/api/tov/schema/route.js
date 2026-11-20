import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { TOV_TEMPLATE_SECTIONS } from "@/lib/tov/template";
import { emptyTovProfile, TOV_PROFILE_SCHEMA, TOV_SCHEMA_VERSION } from "@/lib/tov/schema";

/**
 * Brand Core-skabelonen: JSON-skema for profilen, indholdsstandard pr. sektion og en tom profil.
 * Bruges af API/MCP-klienter der skal skrive en profil (PATCH /api/clients/{id}/tov).
 */
export async function GET() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  return NextResponse.json({
    schemaVersion: TOV_SCHEMA_VERSION,
    schema: TOV_PROFILE_SCHEMA,
    contentStandard: TOV_TEMPLATE_SECTIONS,
    emptyProfile: emptyTovProfile(),
  });
}
