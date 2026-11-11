import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { fetchKnowledgeTagSuggestions } from "@/lib/server/knowledge-data";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  try {
    const tags = await fetchKnowledgeTagSuggestions({ includeTest });
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente tags";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
