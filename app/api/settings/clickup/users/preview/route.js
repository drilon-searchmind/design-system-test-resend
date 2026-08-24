import { NextResponse } from "next/server";

import { previewClickUpUsersSync } from "@/lib/server/clickup-users-sync";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const preview = await previewClickUpUsersSync();
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente ClickUp-preview";
    const status = message.includes("CLICKUP_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
