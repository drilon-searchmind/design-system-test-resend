import { NextRequest } from "next/server";

import { pathParamNames } from "@/lib/mcp/tools";

const MAX_TEXT = 900_000;

/**
 * Call the existing route handler for a tool and shape the MCP tool result.
 * Must run inside runWithMcpAuth().
 *
 * @param {import('@/lib/mcp/tools').McpTool} tool
 * @param {Record<string, any>} args
 * @param {string} baseUrl
 */
export async function dispatchTool(tool, args, baseUrl) {
  const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

  const names = pathParamNames(tool);
  /** @type {Record<string, string>} */
  const params = {};
  let path = tool.path;
  for (const n of names) {
    const v = args?.[n];
    if (v === undefined || v === null || String(v).trim() === "") return fail(`Missing required argument: ${n}`);
    params[n] = String(v);
    path = path.replace(`{${n}}`, encodeURIComponent(String(v)));
  }

  const qs = new URLSearchParams();
  const query = args?.query && typeof args.query === "object" ? args.query : {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const url = `${baseUrl}${path}${qs.size ? `?${qs}` : ""}`;

  const hasBody = tool.method !== "GET" && args?.body !== undefined && args.body !== null;
  if (tool.confirm && args?.body?.confirm !== "RESET DEMO") {
    return fail("Refused: body.confirm must equal 'RESET DEMO'. Ask the user for explicit approval first.");
  }

  const req = new NextRequest(url, {
    method: tool.method,
    headers: hasBody ? { "content-type": "application/json" } : {},
    body: hasBody ? JSON.stringify(args.body) : undefined,
  });

  let res;
  try {
    const mod = await tool.load();
    const handler = mod[tool.method];
    if (typeof handler !== "function") return fail(`Handler ${tool.method} not available for ${tool.path}`);
    res = await handler(req, { params: Promise.resolve(params) });
  } catch (e) {
    return fail(`Tool crashed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const status = res.status;
  const type = res.headers.get("content-type") ?? "";

  if (type.includes("application/pdf")) {
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      isError: !res.ok,
      content: [
        {
          type: "resource",
          resource: {
            uri: `crm://${path}`,
            mimeType: "application/pdf",
            blob: buf.toString("base64"),
          },
        },
      ],
    };
  }

  // Redirect responses (e.g. OAuth flows) carry no useful body.
  if (status >= 300 && status < 400) {
    return fail(`Endpoint responded with redirect (${status}) to ${res.headers.get("location") ?? "?"}`);
  }

  let text = await res.text();
  if (type.includes("application/json")) {
    try {
      text = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      /* keep raw */
    }
  }
  if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}\n…[truncated ${text.length - MAX_TEXT} chars]`;
  return {
    isError: !res.ok,
    content: [{ type: "text", text: res.ok ? text || `OK (${status})` : `HTTP ${status}\n${text}` }],
  };
}
