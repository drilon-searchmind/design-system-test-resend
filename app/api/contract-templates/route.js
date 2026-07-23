import { NextResponse } from "next/server";

import {
  createContractTemplate,
  ensureDefaultContractTemplate,
  listContractTemplates,
} from "@/lib/server/contract-templates-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    await ensureDefaultContractTemplate({ includeTest });
    const data = await listContractTemplates({ includeTest });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente skabeloner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await createContractTemplate({
      key: typeof body?.key === "string" ? body.key : "",
      name: typeof body?.name === "string" ? body.name : "",
      subject: typeof body?.subject === "string" ? body.subject : "",
      emailBodyMd: typeof body?.emailBodyMd === "string" ? body.emailBodyMd : "",
      documentBodyMd: typeof body?.documentBodyMd === "string" ? body.documentBodyMd : "",
      defaultType: typeof body?.defaultType === "string" ? body.defaultType : undefined,
      defaultNoticeDays:
        typeof body?.defaultNoticeDays === "number" ? body.defaultNoticeDays : undefined,
      isDefault: Boolean(body?.isDefault),
      includeTest,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette skabelon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
