import { NextResponse } from "next/server";

import { previewClickUpDisciplinesSync } from "@/lib/server/clickup-disciplines-sync";
import { requireAdmin } from "@/lib/server/require-admin";

export async function POST() {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const preview = await previewClickUpDisciplinesSync();
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente disciplin-preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
