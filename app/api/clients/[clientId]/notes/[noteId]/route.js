import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import { deleteClientNote, updateClientNote } from "@/lib/server/client-notes-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Ret en note: `{ body: string; type?: 'note' | 'call' | 'meeting' | 'alert' }`.
 * Kun forfatteren eller en admin (noter uden forfatter: kun admin).
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string; noteId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId, noteId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    const result = await updateClientNote(clientId, includeTest, authResult.session, noteId, {
      body: body?.body,
      type: body?.type,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke gemme note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Slet en note. Samme regler som PATCH.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientId: string; noteId: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientId, noteId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const result = await deleteClientNote(clientId, includeTest, authResult.session, noteId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
