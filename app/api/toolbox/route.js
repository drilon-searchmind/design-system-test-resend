import { NextResponse } from "next/server";

import { sessionUserIsAdmin } from "@/lib/auth/session-admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { requireSession } from "@/lib/server/require-session";
import { createToolboxTool, listToolboxTools } from "@/lib/server/toolbox-data";

/** Værktøjer i Toolbox. Værktøjer markeret "kun admin" sendes kun til admins. */
export async function GET() {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  try {
    const includeAdminOnly = await sessionUserIsAdmin(authResult.session);
    return NextResponse.json(await listToolboxTools({ includeAdminOnly }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente værktøjer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Opret værktøj (admin): `{ name, url, description?, category?, adminOnly?, sortOrder? }`.
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await req.json();
    const result = await createToolboxTool(body && typeof body === "object" ? body : {});
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette værktøj";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
