import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isMcpEmailAllowed } from "@/lib/mcp/access";
import { escapeHtml, htmlPage } from "@/lib/mcp/http";
import { signToken, verifyToken } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";

function errorRedirect(redirectUri, state, error, description) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (description) u.searchParams.set("error_description", description);
  if (state) u.searchParams.set("state", state);
  return NextResponse.redirect(u, 303);
}

/** Step 1: validate request, require Google login, show consent. */
export async function GET(req) {
  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("client_id");
  const redirectUri = sp.get("redirect_uri");
  const state = sp.get("state") ?? "";
  const challenge = sp.get("code_challenge");

  const client = verifyToken(clientId, "client");
  if (!client || !redirectUri || !client.uris?.includes(redirectUri)) {
    return htmlPage("Ugyldig anmodning", "<h1>Ugyldig anmodning</h1><p>Ukendt klient eller redirect-URL.</p>", 400);
  }
  if (sp.get("response_type") !== "code" || !challenge || sp.get("code_challenge_method") !== "S256") {
    return errorRedirect(redirectUri, state, "invalid_request", "response_type=code and PKCE S256 are required");
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const back = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(back)}`, req.nextUrl.origin), 302);
  }
  if (!isMcpEmailAllowed(email)) {
    return htmlPage(
      "Ingen adgang",
      `<h1>Ingen adgang</h1><p><code>${escapeHtml(email)}</code> har ikke adgang til CRM'ets MCP-server. Kontakt en administrator.</p>`,
      403,
    );
  }

  const ctx = signToken("consent", { cid: clientId, ru: redirectUri, cc: challenge, st: state, sub: email }, 600);
  const host = new URL(redirectUri).host;
  return htmlPage(
    "Giv adgang",
    `<h1>Giv ${escapeHtml(client.name)} adgang?</h1>
<p>${escapeHtml(client.name)} (<code>${escapeHtml(host)}</code>) vil læse og skrive i Agency CRM som <code>${escapeHtml(email)}</code>: klienter, kontrakter, opgaver, tid, NPS og indstillinger.</p>
<form method="post"><input type="hidden" name="ctx" value="${escapeHtml(ctx)}">
<div class="row"><button name="decision" value="deny" type="submit">Afvis</button><button class="primary" name="decision" value="allow" type="submit">Tillad</button></div></form>`,
  );
}

/** Step 2: user decision; issues a short-lived authorization code. */
export async function POST(req) {
  const form = await req.formData().catch(() => null);
  const ctx = verifyToken(String(form?.get("ctx") ?? ""), "consent");
  if (!ctx) {
    return htmlPage("Udløbet", "<h1>Anmodningen er udløbet</h1><p>Start forbindelsen igen fra Claude.</p>", 400);
  }
  if (form.get("decision") !== "allow") {
    return errorRedirect(ctx.ru, ctx.st, "access_denied", "User denied access");
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email || email.toLowerCase() !== String(ctx.sub).toLowerCase() || !isMcpEmailAllowed(email)) {
    return htmlPage("Ingen adgang", "<h1>Ingen adgang</h1><p>Sessionen matcher ikke anmodningen.</p>", 403);
  }

  const code = signToken("code", { cid: ctx.cid, ru: ctx.ru, cc: ctx.cc, sub: String(ctx.sub).toLowerCase() }, 300);
  const u = new URL(ctx.ru);
  u.searchParams.set("code", code);
  if (ctx.st) u.searchParams.set("state", ctx.st);
  return NextResponse.redirect(u, 303);
}
