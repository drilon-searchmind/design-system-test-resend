import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { patchClientNpsSettings } from "@/lib/server/nps-send-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ clientSlug: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { clientSlug: clientSlugEncoded } = await ctx.params;
  const clientSlug = decodeURIComponent(clientSlugEncoded ?? "");
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();

    /** @type {Parameters<typeof patchClientNpsSettings>[1]} */
    const patch = { includeTest };

    if (typeof body?.npsSendEnabled === "boolean") {
      patch.npsSendEnabled = body.npsSendEnabled;
    }

    if (typeof body?.npsRecipientKind === "string") {
      patch.npsRecipientKind = /** @type {'primary' | 'secondary' | 'contact' | 'custom'} */ (body.npsRecipientKind);
    }

    if (body?.npsRecipientContactId === null || typeof body?.npsRecipientContactId === "string") {
      patch.npsRecipientContactId = body.npsRecipientContactId;
    }

    if (body?.npsRecipientCustom === null) {
      patch.npsRecipientCustom = null;
    } else if (body?.npsRecipientCustom && typeof body.npsRecipientCustom === "object") {
      patch.npsRecipientCustom = {
        name: typeof body.npsRecipientCustom.name === "string" ? body.npsRecipientCustom.name : "",
        email: typeof body.npsRecipientCustom.email === "string" ? body.npsRecipientCustom.email : "",
      };
    }

    const result = await patchClientNpsSettings(clientSlug, patch);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere NPS-indstillinger";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
