import { NextResponse } from "next/server";

import {
  createAndSendContractForSignature,
  sendSigningInviteForContract,
} from "@/lib/server/contract-send-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Create a contract for a client and send signing e-mail, or re-send for an existing contract.
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const contractId =
      typeof body?.contractId === "string" ? body.contractId.trim()
      : typeof body?.contractKey === "string" ? body.contractKey.trim()
      : "";

    if (contractId) {
      const result = await sendSigningInviteForContract({
        contractId,
        contactEmail: typeof body?.contactEmail === "string" ? body.contactEmail : undefined,
        includeTest,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json(result);
    }

    const result = await createAndSendContractForSignature({
      clientId: typeof body?.clientId === "string" ? body.clientId : undefined,
      clientSlug: typeof body?.clientSlug === "string" ? body.clientSlug : undefined,
      templateKey: typeof body?.templateKey === "string" ? body.templateKey : undefined,
      templateId: typeof body?.templateId === "string" ? body.templateId : undefined,
      label: typeof body?.label === "string" ? body.label : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      value: typeof body?.value === "number" ? body.value : undefined,
      currency: typeof body?.currency === "string" ? body.currency : undefined,
      noticeDays: typeof body?.noticeDays === "number" ? body.noticeDays : undefined,
      documentBodyMd: typeof body?.documentBodyMd === "string" ? body.documentBodyMd : undefined,
      contactEmail: typeof body?.contactEmail === "string" ? body.contactEmail : undefined,
      startDate: typeof body?.startDate === "string" ? body.startDate : undefined,
      renewalDate: typeof body?.renewalDate === "string" ? body.renewalDate : undefined,
      includeTest,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke sende kontrakt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
