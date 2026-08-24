import { NextResponse } from "next/server";

import { applyClickUpKnowledgeSync } from "@/lib/server/clickup-knowledge-sync";
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

  const ids = Array.isArray(body.clickupPageIds)
    ? body.clickupPageIds.filter((id) => typeof id === "string" && id.trim())
    : [];

  try {
    const result = await applyClickUpKnowledgeSync(ids);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke importere artikler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
