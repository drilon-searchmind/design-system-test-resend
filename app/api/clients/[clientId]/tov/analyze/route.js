import { after, NextResponse } from "next/server";

import { readIncludeTest } from "@/lib/server/include-test";
import { requireSession } from "@/lib/server/require-session";
import { beginAnalysis, cancelAnalysis, runAnalysis } from "@/lib/server/tov-data";

/**
 * Start analysen. Svarer straks (status "analyzing"); selve modelkaldet kører efter svaret
 * er sendt, og klienten poller GET /tov indtil status er "ready" eller "error".
 * Body: { model?, comment?, domains? }
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const by = authResult.session.user?.name ?? authResult.session.user?.email ?? undefined;
    const job = await beginAnalysis(clientId, readIncludeTest(req), { ...body, by });
    if ("error" in job) {
      return NextResponse.json({ error: job.error }, { status: job.status ?? 400 });
    }
    after(() => runAnalysis(job));
    return NextResponse.json({ started: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}

/** Afbryd kørende analyse (resultatet kasseres). */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  try {
    const out = await cancelAnalysis(clientId, readIncludeTest(req));
    if ("error" in out) return NextResponse.json({ error: out.error }, { status: out.status ?? 400 });
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}
