import { NextResponse } from "next/server";

import {
  generateKnowledgeSummary,
  hasEnoughKbSummarySource,
  isKbSummaryAiConfigured,
} from "@/lib/server/kb-summary-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Generér et kort AI-resumé ud fra titel + brødtekst (gemmer ikke noget).
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  if (!isKbSummaryAiConfigured()) {
    return NextResponse.json(
      { error: "AI-resumé er ikke sat op (CLAUDE_API_KEY mangler)" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const input = {
      title: typeof body?.title === "string" ? body.title : "",
      bodyMd: typeof body?.bodyMd === "string" ? body.bodyMd : "",
    };
    if (!hasEnoughKbSummarySource(input)) {
      return NextResponse.json(
        { error: "Skriv lidt mere i artiklen, før der kan laves et resumé" },
        { status: 400 },
      );
    }
    const summary = await generateKnowledgeSummary(input);
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke generere resumé";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
