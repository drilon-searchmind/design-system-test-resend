import { jsonCors, optionsCors } from "@/lib/mcp/http";
import { signToken } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsCors();
}

function validRedirect(uri) {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/** RFC 7591 dynamic client registration (public clients, stateless client_id). */
export async function POST(req) {
  const body = await req.json().catch(() => null);
  const uris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (!uris.length || uris.length > 10 || !uris.every(validRedirect)) {
    return jsonCors(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be https (or localhost) URLs" },
      400,
    );
  }
  const name = typeof body?.client_name === "string" ? body.client_name.slice(0, 80) : "MCP client";
  const clientId = signToken("client", { uris, name }, null);
  return jsonCors(
    {
      client_id: clientId,
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    201,
  );
}
