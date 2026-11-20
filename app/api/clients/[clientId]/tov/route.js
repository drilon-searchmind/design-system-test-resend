import { NextResponse } from "next/server";

import { readIncludeTest } from "@/lib/server/include-test";
import { requireSession } from "@/lib/server/require-session";
import { getTovState, restoreHistory, saveProfileEdit, updateTovSettings } from "@/lib/server/tov-data";

/** @param {{ error: string; status?: number }} r */
const fail = (r) => NextResponse.json({ error: r.error }, { status: r.status ?? 400 });

/** Brand Core-arbejdsrum for én kunde. */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  try {
    const state = await getTovState(clientId, readIncludeTest(req));
    if ("error" in state) return fail(state);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}

/**
 * Body (ét af):
 *  - { comment?, model? }   gem indstillinger
 *  - { profile }            gem hele profilen (erstatter; manglende felter tømmes). Opretter profilen hvis den ikke findes
 *  - { profilePatch }       flet en delvis profil ind i den gemte (objekter flettes, lister erstattes)
 *  - { restoreIndex }       gendan tidligere version
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);
  const by = authResult.session.user?.name ?? authResult.session.user?.email ?? undefined;
  try {
    const body = await req.json();
    const result =
      body && typeof body.restoreIndex === "number" ? await restoreHistory(clientId, includeTest, body.restoreIndex)
      : body?.profile ? await saveProfileEdit(clientId, includeTest, body.profile, { by, mode: "replace" })
      : body?.profilePatch ? await saveProfileEdit(clientId, includeTest, body.profilePatch, { by, mode: "merge" })
      : await updateTovSettings(clientId, includeTest, body ?? {});
    if ("error" in result) return fail(result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}
