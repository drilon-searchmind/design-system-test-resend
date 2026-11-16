import { isMcpEmailAllowed } from "@/lib/mcp/access";
import { jsonCors, optionsCors } from "@/lib/mcp/http";
import { consumeOnce, pkceMatches, signToken, verifyToken } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";

const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 60 * 60 * 24 * 30;

export function OPTIONS() {
  return optionsCors();
}

function issue(email) {
  return jsonCors({
    access_token: signToken("access", { sub: email }, ACCESS_TTL),
    token_type: "Bearer",
    expires_in: ACCESS_TTL,
    refresh_token: signToken("refresh", { sub: email }, REFRESH_TTL),
    scope: "mcp",
  });
}

const err = (error, description, status = 400) => jsonCors({ error, error_description: description }, status);

export async function POST(req) {
  const ct = req.headers.get("content-type") ?? "";
  /** @type {Record<string, string>} */
  let p = {};
  if (ct.includes("application/json")) {
    p = (await req.json().catch(() => ({}))) ?? {};
  } else {
    const form = await req.formData().catch(() => null);
    if (form) p = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  }

  if (p.grant_type === "authorization_code") {
    const code = verifyToken(p.code, "code");
    if (!code) return err("invalid_grant", "Invalid or expired code");
    if (code.cid !== p.client_id || code.ru !== p.redirect_uri) {
      return err("invalid_grant", "client_id or redirect_uri mismatch");
    }
    if (!pkceMatches(p.code_verifier, code.cc)) return err("invalid_grant", "PKCE verification failed");
    if (!consumeOnce(code.jti)) return err("invalid_grant", "Code already used");
    if (!isMcpEmailAllowed(code.sub)) return err("access_denied", "User not allowed", 403);
    return issue(code.sub);
  }

  if (p.grant_type === "refresh_token") {
    const rt = verifyToken(p.refresh_token, "refresh");
    if (!rt) return err("invalid_grant", "Invalid or expired refresh token");
    if (!isMcpEmailAllowed(rt.sub)) return err("access_denied", "User not allowed", 403);
    return issue(rt.sub);
  }

  return err("unsupported_grant_type", "Use authorization_code or refresh_token");
}
