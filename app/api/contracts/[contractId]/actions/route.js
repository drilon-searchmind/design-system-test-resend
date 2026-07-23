import { NextResponse } from "next/server";

import {
  renewContract,
  updateContractLifecycle,
} from "@/lib/server/contract-signing-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ contractId: string }> }} ctx
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { contractId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "renew") {
      const result = await renewContract({
        contractId,
        documentBodyMd: typeof body?.documentBodyMd === "string" ? body.documentBodyMd : undefined,
        label: typeof body?.label === "string" ? body.label : undefined,
        value: typeof body?.value === "number" ? body.value : undefined,
        includeTest,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "pause" || action === "close" || action === "activate") {
      const result = await updateContractLifecycle({
        contractId,
        action,
        includeTest,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere kontrakt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
