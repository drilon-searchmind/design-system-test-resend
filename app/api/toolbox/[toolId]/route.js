import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/require-admin";
import { deleteToolboxTool, updateToolboxTool } from "@/lib/server/toolbox-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ toolId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { toolId } = await ctx.params;

  try {
    const body = await req.json();
    const result = await updateToolboxTool(toolId, body && typeof body === "object" ? body : {});
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke gemme værktøj";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ toolId: string }> }} ctx
 */
export async function DELETE(_req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { toolId } = await ctx.params;

  try {
    const result = await deleteToolboxTool(toolId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette værktøj";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
