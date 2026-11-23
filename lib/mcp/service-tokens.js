import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { normalizeEmail } from "@/lib/auth/workspace-sso";
import McpServiceToken from "@/lib/db/models/mcp-service-token";
import { connectDb } from "@/lib/db/mongoose";

/**
 * Long-lived MCP bearer tokens for non-Claude clients.
 *
 * Primary store: MongoDB (`McpServiceToken`) — create via admin API or
 * `node scripts/generate-mcp-service-token.mjs email@…`
 *
 * Optional Railway fallback (legacy / bootstrap):
 *   MCP_SERVICE_TOKEN + MCP_SERVICE_TOKEN_EMAIL
 *   MCP_SERVICE_TOKENS=token:email,…
 */

/** @param {string} token */
export function hashServiceToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/** @param {string} [email] */
export function mintServiceTokenValue(email) {
  void email;
  return `smcp_${randomBytes(32).toString("hex")}`;
}

/**
 * @param {string} a
 * @param {string} b
 */
function safeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** @returns {Map<string, string>} token → email (env only) */
function loadEnvServiceTokenMap() {
  /** @type {Map<string, string>} */
  const map = new Map();

  const multi = process.env.MCP_SERVICE_TOKENS ?? "";
  for (const part of multi.split(/[\n,;]+/)) {
    const raw = part.trim();
    if (!raw) continue;
    const idx = raw.lastIndexOf(":");
    if (idx <= 0) continue;
    const token = raw.slice(0, idx).trim();
    const email = normalizeEmail(raw.slice(idx + 1));
    if (token && email) map.set(token, email);
  }

  const single = (process.env.MCP_SERVICE_TOKEN ?? "").trim();
  const singleEmail = normalizeEmail(process.env.MCP_SERVICE_TOKEN_EMAIL ?? "");
  if (single && singleEmail) map.set(single, singleEmail);

  return map;
}

/**
 * Create a DB-backed token. Returns plaintext once.
 * @param {{ email: string; label?: string; createdBy?: string }} input
 */
export async function createMcpServiceToken(input) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email er påkrævet");
  const token = mintServiceTokenValue(email);
  await connectDb();
  const doc = await McpServiceToken.create({
    tokenHash: hashServiceToken(token),
    tokenPrefix: token.slice(0, 12),
    email,
    label: typeof input.label === "string" ? input.label.trim().slice(0, 120) : "",
    createdBy: typeof input.createdBy === "string" ? input.createdBy.trim().slice(0, 200) : "",
  });
  return {
    id: String(doc._id),
    token,
    email: doc.email,
    label: doc.label ?? "",
    tokenPrefix: doc.tokenPrefix,
    createdAt: doc.createdAt,
  };
}

/** @returns {Promise<Array<{ id: string; email: string; label: string; tokenPrefix: string; createdAt: Date; lastUsedAt: Date | null; revokedAt: Date | null }>>} */
export async function listMcpServiceTokens() {
  await connectDb();
  const rows = await McpServiceToken.find({})
    .sort({ createdAt: -1 })
    .select("email label tokenPrefix createdAt lastUsedAt revokedAt")
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    email: String(r.email),
    label: String(r.label ?? ""),
    tokenPrefix: String(r.tokenPrefix ?? ""),
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt ?? null,
    revokedAt: r.revokedAt ?? null,
  }));
}

/** Soft-revoke (or hard-delete if already revoked). @param {string} id */
export async function revokeMcpServiceToken(id) {
  await connectDb();
  const doc = await McpServiceToken.findById(id);
  if (!doc) return { error: "Token findes ikke", status: 404 };
  if (!doc.revokedAt) {
    doc.revokedAt = new Date();
    await doc.save();
  }
  return { ok: true };
}

/**
 * @param {string | null | undefined} token
 * @returns {Promise<{ sub: string; typ: 'access'; svc: true } | null>}
 */
export async function verifyServiceToken(token) {
  if (!token || typeof token !== "string") return null;

  // Env fallback (bootstrap / emergency)
  const envMap = loadEnvServiceTokenMap();
  for (const [configured, email] of envMap) {
    if (safeEqualStr(configured, token)) {
      return { sub: email, typ: "access", svc: true };
    }
  }

  try {
    await connectDb();
    const hash = hashServiceToken(token);
    const doc = await McpServiceToken.findOne({ tokenHash: hash, revokedAt: null }).lean();
    if (!doc?.email) return null;
    // Fire-and-forget lastUsedAt
    void McpServiceToken.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).exec();
    return { sub: normalizeEmail(doc.email), typ: "access", svc: true };
  } catch {
    return null;
  }
}
