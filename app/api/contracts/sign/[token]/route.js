import { NextResponse } from "next/server";

import {
  extractClientIp,
  getContractSigningSession,
  submitContractSignature,
  unlockContractSigningSession,
} from "@/lib/server/contract-signing-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ token: string }> }} ctx
 */
export async function GET(_req, ctx) {
  const { token: tokenEncoded } = await ctx.params;
  const token = decodeURIComponent(tokenEncoded ?? "");

  try {
    const data = await getContractSigningSession(token);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fejl";
    return NextResponse.json({ error: message, status: "invalid" }, { status: 500 });
  }
}

/**
 * Unlock with access code, or submit signature.
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ token: string }> }} ctx
 */
export async function POST(req, ctx) {
  const { token: tokenEncoded } = await ctx.params;
  const token = decodeURIComponent(tokenEncoded ?? "");

  try {
    const body = await req.json();
    const intent = typeof body?.intent === "string" ? body.intent : "unlock";

    if (intent === "unlock") {
      const result = await unlockContractSigningSession({
        token,
        accessCode: typeof body?.accessCode === "string" ? body.accessCode : "",
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json(result);
    }

    if (intent === "sign") {
      const result = await submitContractSignature({
        token,
        signerName: typeof body?.signerName === "string" ? body.signerName : "",
        signerTitle: typeof body?.signerTitle === "string" ? body.signerTitle : undefined,
        signerCompany: typeof body?.signerCompany === "string" ? body.signerCompany : undefined,
        consentAccepted: Boolean(body?.consentAccepted),
        ipAddress: extractClientIp(req),
        userAgent: req.headers.get("user-agent") ?? "",
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Ukendt intent" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
