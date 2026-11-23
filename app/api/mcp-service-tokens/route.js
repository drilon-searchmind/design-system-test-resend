import { NextResponse } from "next/server";

import { isMcpEmailAllowed } from "@/lib/mcp/access";
import { createMcpServiceToken, listMcpServiceTokens } from "@/lib/mcp/service-tokens";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

/** List MCP service tokens (no secrets). Admin only. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const tokens = await listMcpServiceTokens();
    return NextResponse.json({ tokens });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente tokens" },
      { status: 500 },
    );
  }
}

/**
 * Create a long-lived MCP service token. Plaintext returned once.
 * Body: { email: string, label?: string }
 */
export async function POST(req) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) return NextResponse.json({ error: "email er påkrævet" }, { status: 400 });
    if (!isMcpEmailAllowed(email)) {
      return NextResponse.json(
        {
          error:
            "Email er ikke på MCP-allowlisten. Tilføj den til MCP_ALLOWED_EMAILS (eller brug en allerede tilladt adresse).",
        },
        { status: 400 },
      );
    }
    const created = await createMcpServiceToken({
      email,
      label: typeof body?.label === "string" ? body.label : "",
      createdBy: auth.session.user?.email ?? auth.session.user?.name ?? "",
    });
    return NextResponse.json({
      ...created,
      hint: "Gem token nu — den kan ikke hentes igen. Brug Authorization: Bearer <token> mod /api/mcp",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke oprette token" },
      { status: 500 },
    );
  }
}
