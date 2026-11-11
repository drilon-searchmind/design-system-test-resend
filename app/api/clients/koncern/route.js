import { requireAdmin } from "@/lib/server/require-admin";
import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { createClientGroupMongo } from "@/lib/server/client-groups-data";

/**
 * Opret/udvid koncern: giver de valgte kunder samme CVR.
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    const result = await createClientGroupMongo(includeTest, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette kundegruppe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
