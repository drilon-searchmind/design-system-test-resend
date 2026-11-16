import { NextResponse } from "next/server";

import { buildMcpSession, isMcpEmailAllowed } from "@/lib/mcp/access";
import { runWithMcpAuth } from "@/lib/mcp/auth-context";
import { dispatchTool } from "@/lib/mcp/dispatch";
import { CORS_HEADERS, optionsCors } from "@/lib/mcp/http";
import { MCP_TOOLS, TOOLS_BY_NAME, toolDescriptor } from "@/lib/mcp/tools";
import { publicBaseUrl, verifyToken } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS =
  "Agency CRM. Tools mirror the CRM's REST API (clients, contracts, tasks, time, NPS, knowledge base, team, settings). " +
  "Pass path parameters as top-level arguments, URL query as `query`, JSON payload as `body`. " +
  "Test data (Testkunde ApS) is hidden unless query.includeTest=1. Confirm with the user before destructive calls.";

export function OPTIONS() {
  return optionsCors();
}

/** No server-initiated stream is offered. */
export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, DELETE, OPTIONS" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function unauthorized(req, description) {
  const base = publicBaseUrl(req);
  return NextResponse.json(
    { error: "unauthorized", error_description: description },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "WWW-Authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/api/mcp"`,
      },
    },
  );
}

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

/**
 * @param {any} msg
 * @param {{ email: string, session: any, baseUrl: string }} ctx
 */
async function handleMessage(msg, ctx) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg?.id ?? null, -32600, "Invalid Request");
  }
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const wanted = params?.protocolVersion;
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(wanted) ? wanted : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "agency-crm", title: "Agency CRM", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: MCP_TOOLS.map(toolDescriptor) });
    case "tools/call": {
      const tool = TOOLS_BY_NAME.get(params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      const result = await runWithMcpAuth({ session: ctx.session, isAdmin: true }, () =>
        dispatchTool(tool, params?.arguments ?? {}, ctx.baseUrl),
      );
      return rpcResult(id, result);
    }
    case "resources/list":
      return rpcResult(id, { resources: [] });
    case "resources/templates/list":
      return rpcResult(id, { resourceTemplates: [] });
    case "prompts/list":
      return rpcResult(id, { prompts: [] });
    default:
      if (isNotification || method.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const claims = verifyToken(token, "access");
  if (!claims) return unauthorized(req, "Missing, invalid or expired access token");
  if (!isMcpEmailAllowed(claims.sub)) return unauthorized(req, "User is not allowed to use the MCP server");

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS_HEADERS });
  }

  const session = await buildMcpSession(claims.sub);
  const ctx = { email: claims.sub, session, baseUrl: publicBaseUrl(req) };

  const batch = Array.isArray(payload);
  const messages = batch ? payload : [payload];
  const out = [];
  for (const m of messages) {
    const r = await handleMessage(m, ctx);
    if (r) out.push(r);
  }

  if (out.length === 0) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return NextResponse.json(batch ? out : out[0], { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}
