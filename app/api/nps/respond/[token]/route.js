import { NextResponse } from "next/server";

import { fetchNpsSurveyByToken, submitNpsSurveyResponse } from "@/lib/server/nps-respond-data";

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ token: string }> }} ctx
 */
export async function GET(_req, ctx) {
  const { token: tokenEncoded } = await ctx.params;
  const token = decodeURIComponent(tokenEncoded ?? "");

  try {
    const survey = await fetchNpsSurveyByToken(token);
    return NextResponse.json(survey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente undersøgelse";
    return NextResponse.json({ error: message, status: "invalid" }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ token: string }> }} ctx
 */
export async function POST(req, ctx) {
  const { token: tokenEncoded } = await ctx.params;
  const token = decodeURIComponent(tokenEncoded ?? "");

  try {
    const body = await req.json();
    const score = Number(body?.score);
    const comment = typeof body?.comment === "string" ? body.comment : undefined;

    const result = await submitNpsSurveyResponse(token, { score, comment });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke gemme svar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
