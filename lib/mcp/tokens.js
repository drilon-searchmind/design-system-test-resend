import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Stateless signed tokens (HMAC-SHA256) for the MCP OAuth flow. */

function secret() {
  const base = process.env.MCP_SIGNING_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!base) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MCP_SIGNING_SECRET or AUTH_SECRET must be set");
    }
    return "dev-mcp-secret-not-for-production";
  }
  return `mcp-v1:${base}`;
}

const b64u = (buf) => Buffer.from(buf).toString("base64url");

function mac(data) {
  return createHmac("sha256", secret()).update(data).digest();
}

/**
 * @param {string} typ
 * @param {Record<string, unknown>} claims
 * @param {number | null} ttlSeconds
 */
export function signToken(typ, claims, ttlSeconds) {
  const payload = {
    ...claims,
    typ,
    jti: randomBytes(8).toString("hex"),
    ...(ttlSeconds ? { exp: Math.floor(Date.now() / 1000) + ttlSeconds } : {}),
  };
  const body = b64u(JSON.stringify(payload));
  return `${body}.${b64u(mac(body))}`;
}

/**
 * @param {string | null | undefined} token
 * @param {string} typ
 * @returns {Record<string, any> | null}
 */
export function verifyToken(token, typ) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(body);
  let given;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload?.typ !== typ) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/** PKCE S256 check. */
export function pkceMatches(verifier, challenge) {
  if (!verifier || !challenge) return false;
  const digest = createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(digest);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Best-effort single use of authorization codes (per instance). */
const usedCodes = new Map();
export function consumeOnce(jti) {
  const now = Date.now();
  for (const [k, exp] of usedCodes) if (exp < now) usedCodes.delete(k);
  if (usedCodes.has(jti)) return false;
  usedCodes.set(jti, now + 10 * 60 * 1000);
  return true;
}

/**
 * Public base URL of this deployment (behind Railway's proxy).
 * @param {Request} req
 */
export function publicBaseUrl(req) {
  const fixed = process.env.MCP_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (fixed && process.env.NODE_ENV === "production") return fixed.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return (fixed ?? "http://localhost:3000").replace(/\/$/, "");
}
