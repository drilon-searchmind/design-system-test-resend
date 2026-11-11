import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import {
  deleteTimeEntryMongo,
  fetchTimeEntryDetailBundle,
  updateTimeEntryMongo,
} from "@/lib/server/time-entries-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ entryId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { entryId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const bundle = await fetchTimeEntryDetailBundle({
      session: authResult.session,
      entryKeyOrId: entryId,
      includeTest,
    });
    if ("error" in bundle && typeof bundle.error === "string")
      return NextResponse.json({ error: bundle.error }, { status: typeof bundle.status === "number" ? bundle.status : 400 });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente registrering";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ entryId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { entryId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  try {
    const res = await updateTimeEntryMongo(authResult.session, entryId, includeTest === true, body);
    if ("error" in res && typeof res.error === "string")
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere registrering";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ entryId: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { entryId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const res = await deleteTimeEntryMongo(authResult.session, entryId, includeTest === true);
    if ("error" in res && typeof res.error === "string")
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette registrering";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
