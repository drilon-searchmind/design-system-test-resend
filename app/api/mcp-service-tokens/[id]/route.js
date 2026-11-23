import { NextResponse } from "next/server";

import { revokeMcpServiceToken } from "@/lib/mcp/service-tokens";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

/** Revoke a DB-backed MCP service token. Admin only. */
export async function DELETE(_req, ctx) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  try {
    const result = await revokeMcpServiceToken(id);
    if (result?.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke tilbagekalde token" },
      { status: 500 },
    );
  }
}
