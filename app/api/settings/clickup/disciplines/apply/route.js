import { NextResponse } from "next/server";

import { applyClickUpDisciplinesSync } from "@/lib/server/clickup-disciplines-sync";
import { requireAdmin } from "@/lib/server/require-admin";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const keys = Array.isArray(body.memberKeys)
    ? body.memberKeys.filter((key) => typeof key === "string" && key.trim())
    : [];

  try {
    const result = await applyClickUpDisciplinesSync(keys);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere discipliner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
