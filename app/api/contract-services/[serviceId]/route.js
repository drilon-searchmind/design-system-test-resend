import { requireAdmin } from "@/lib/server/require-admin";
import { NextResponse } from "next/server";

import {
  deleteContractService,
  updateContractService,
} from "@/lib/server/contract-services-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ serviceId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { serviceId } = await ctx.params;

  try {
    const body = await req.json();
    const result = await updateContractService({
      serviceId,
      patch: body && typeof body === "object" ? body : {},
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ serviceId: string }> }} ctx
 */
export async function DELETE(_req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { serviceId } = await ctx.params;

  try {
    const result = await deleteContractService({ serviceId });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
