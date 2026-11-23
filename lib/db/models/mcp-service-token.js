import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Long-lived MCP bearer tokens (hashed). Plaintext is shown once at create time.
 * Used by Cursor / scripts — not Claude OAuth.
 */
const mcpServiceTokenSchema = new Schema(
  {
    /** sha256 hex of the full token (smcp_…) */
    tokenHash: { type: String, required: true, unique: true, index: true },
    /** First 12 chars of token for admin UI (not secret alone) */
    tokenPrefix: { type: String, required: true },
    /** Identity the MCP session runs as — must pass canUseMcp */
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    label: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

const McpServiceToken =
  mongoose.models.McpServiceToken ?? mongoose.model("McpServiceToken", mcpServiceTokenSchema);

export default McpServiceToken;
