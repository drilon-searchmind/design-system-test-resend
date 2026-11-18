import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import {
  createClientNote,
  fetchClientNoteFeed,
  findClientForNotes,
} from "@/lib/server/client-notes-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Alle noter (inkl. opgavekommentarer) for kunden, nyeste først.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const client = await findClientForNotes(clientId, includeTest);
    if (!client) return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });
    const notes = await fetchClientNoteFeed(client._id, { limit: 500, includeTest });
    return NextResponse.json({
      client: { id: String(client.slug ?? client._id), name: String(client.name ?? "") },
      notes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente noter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Opret manuel note: `{ body: string; type?: 'note' | 'call' | 'meeting' | 'alert' }`.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string }> }} ctx
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    const result = await createClientNote(clientId, includeTest, authResult.session, {
      body: body?.body,
      type: body?.type,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke gemme note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
