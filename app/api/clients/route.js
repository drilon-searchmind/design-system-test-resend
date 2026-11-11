import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { createClientMongo } from "@/lib/server/client-create-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    const result = await createClientMongo(includeTest, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette kunde";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
