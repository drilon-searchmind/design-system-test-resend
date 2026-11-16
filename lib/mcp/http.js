import { NextResponse } from "next/server";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Accept",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

/** @param {unknown} body @param {number} [status] @param {Record<string,string>} [headers] */
export function jsonCors(body, status = 200, headers = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...headers },
  });
}

export function optionsCors() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Minimal standalone HTML page (consent / error). */
export function htmlPage(title, bodyHtml, status = 200) {
  const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
body{font-family:system-ui,sans-serif;background:#0b0b0c;color:#f4f4f5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
main{max-width:28rem;padding:2rem;border:1px solid #2a2a2e;border-radius:12px;background:#141416}
h1{font-size:1.15rem;margin:0 0 .75rem}p{color:#a1a1aa;line-height:1.5;font-size:.9rem}
code{color:#f4f4f5}.row{display:flex;gap:.5rem;margin-top:1.25rem}
button{flex:1;padding:.6rem 1rem;border-radius:8px;border:1px solid #3f3f46;background:#1f1f23;color:#f4f4f5;font-size:.9rem;cursor:pointer}
button.primary{background:#f4f4f5;color:#0b0b0c;border-color:#f4f4f5}
</style></head><body><main>${bodyHtml}</main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
