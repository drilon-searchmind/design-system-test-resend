#!/usr/bin/env node
/**
 * Create a long-lived MCP service token in MongoDB (preferred) or print env-var form.
 *
 * Usage:
 *   node scripts/generate-mcp-service-token.mjs email@searchmind.dk [label]
 *
 * Requires MONGODB_URI in the environment (or .env loaded by your shell).
 * Plaintext token is printed once — store it safely.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const email = (process.argv[2] ?? "").trim().toLowerCase();
const label = (process.argv[3] ?? "script").trim();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/generate-mcp-service-token.mjs email@searchmind.dk [label]");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI mangler");
  process.exit(1);
}

const token = `smcp_${randomBytes(32).toString("hex")}`;
const tokenHash = createHash("sha256").update(token).digest("hex");

const schema = new mongoose.Schema(
  {
    tokenHash: String,
    tokenPrefix: String,
    email: String,
    label: String,
    createdBy: String,
    lastUsedAt: Date,
    revokedAt: Date,
  },
  { timestamps: true, collection: "mcpservicetokens" },
);

const Model = mongoose.models.McpServiceTokenScript ?? mongoose.model("McpServiceTokenScript", schema);

await mongoose.connect(uri);
const doc = await Model.create({
  tokenHash,
  tokenPrefix: token.slice(0, 12),
  email,
  label,
  createdBy: "script",
  revokedAt: null,
});
await mongoose.disconnect();

console.log(`
MCP service token gemt i databasen (id ${doc._id})

  Token:  ${token}
  Email:  ${email}
  Label:  ${label}

Kollegaen bruger:

  Authorization: Bearer ${token}
  POST https://design-system-test-resend-production.up.railway.app/api/mcp

Ingen Railway env vars nødvendige for dette token.
Email skal stadig være på MCP-allowlisten (default inkl. kh@searchmind.dk).

Admin API (efter login som admin):
  POST /api/mcp-service-tokens  { "email": "...", "label": "..." }
  GET  /api/mcp-service-tokens
  DELETE /api/mcp-service-tokens/:id
`);
