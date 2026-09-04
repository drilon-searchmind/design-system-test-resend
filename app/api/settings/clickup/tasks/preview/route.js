import { NextResponse } from "next/server";

import { previewClickUpTasksSync } from "@/lib/server/clickup-tasks-sync";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST(request) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  /** @type {{ limit?: number; createdFrom?: string; createdTo?: string }} */
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const preview = await previewClickUpTasksSync({
      limit: body.limit,
      createdFrom: body.createdFrom,
      createdTo: body.createdTo,
    });
    return NextResponse.json({
      ...preview,
      rows: preview.rows.map((row) => ({
        ...row,
        id: row.clickUpTaskId,
        linkUrl: row.clickUpUrl,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente ClickUp-preview";
    const status = message.includes("CLICKUP_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
