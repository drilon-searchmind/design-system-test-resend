import { NextResponse } from "next/server";

import { fetchUserDetailBundle, updateUserMongo } from "@/lib/server/user-detail-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ userId: string }> }} ctx
 */
export async function GET(_req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { userId } = await ctx.params;

  try {
    const bundle = await fetchUserDetailBundle(userId);
    if (bundle?.error) {
      return NextResponse.json({ error: bundle.error }, { status: bundle.status ?? 400 });
    }
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente bruger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ userId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { userId } = await ctx.params;

  try {
    const body = await req.json();
    const result = await updateUserMongo(userId, body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere bruger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
