import { NextResponse } from "next/server";

import { previewClickUpCustomersSync } from "@/lib/server/clickup-customers-sync";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const preview = await previewClickUpCustomersSync();
    return NextResponse.json({
      ...preview,
      rows: preview.rows.map((row) => ({
        ...row,
        id: row.customerClickUpId,
        linkUrl: row.clickUpUrl,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente ClickUp-preview";
    const status = message.includes("CLICKUP_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
