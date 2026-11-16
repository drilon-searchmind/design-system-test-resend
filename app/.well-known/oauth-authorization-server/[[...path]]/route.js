import { jsonCors, optionsCors } from "@/lib/mcp/http";
import { publicBaseUrl } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsCors();
}

/** RFC 8414 authorization server metadata. */
export function GET(req) {
  const base = publicBaseUrl(req);
  return jsonCors({
    issuer: base,
    authorization_endpoint: `${base}/api/mcp-oauth/authorize`,
    token_endpoint: `${base}/api/mcp-oauth/token`,
    registration_endpoint: `${base}/api/mcp-oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
}
