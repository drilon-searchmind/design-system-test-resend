import { NextResponse } from "next/server";

import { createClientGroupMongo } from "@/lib/server/client-groups-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Opret/udvid koncern: giver de valgte kunder samme CVR.
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await createClientGroupMongo(includeTest, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette koncern";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
