import { NextResponse } from "next/server";

import { applyClickUpTasksSync } from "@/lib/server/clickup-tasks-sync";
import { requireAdmin } from "@/lib/server/require-admin";

/**
 * Importér valgte ClickUp-opgaver (bulk eller enkeltvis).
 * Body: `{ clickUpTaskIds: string[]; createdFrom?; createdTo?; limit? }` — perioden skal være den samme som i preview.
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

  const ids = Array.isArray(body.clickUpTaskIds)
    ? body.clickUpTaskIds.filter((id) => typeof id === "string" && id.trim())
    : [];

  try {
    const result = await applyClickUpTasksSync(ids, {
      limit: typeof body.limit === "number" ? body.limit : undefined,
      createdFrom: typeof body.createdFrom === "string" ? body.createdFrom : undefined,
      createdTo: typeof body.createdTo === "string" ? body.createdTo : undefined,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke importere opgaver";
    const status = message.includes("CLICKUP_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
