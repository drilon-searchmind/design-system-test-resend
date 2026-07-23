import { NextResponse } from "next/server";

import {
  deleteContractTemplate,
  updateContractTemplate,
} from "@/lib/server/contract-templates-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await updateContractTemplate({
      templateId,
      patch: body && typeof body === "object" ? body : {},
      includeTest,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateId: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const result = await deleteContractTemplate({ templateId, includeTest });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
