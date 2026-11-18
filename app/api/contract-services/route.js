import { requireAdmin } from "@/lib/server/require-admin";
import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import {
  createContractService,
  listContractServices,
  seedContractServices,
} from "@/lib/server/contract-services-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * Servicekataloget til kontrakter. `?all=1` medtager inaktive (admin-panelet).
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";

  try {
    const data = await listContractServices({ includeTest, includeInactive });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente services";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Opret en service — eller `{ seed: true }` for at gemme standardlisten som katalog.
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  try {
    const body = await req.json();
    if (body?.seed === true) {
      const result = await seedContractServices({ includeTest });
      return NextResponse.json(result, { status: 201 });
    }
    const result = await createContractService({
      key: typeof body?.key === "string" ? body.key : "",
      name: typeof body?.name === "string" ? body.name : "",
      billing: typeof body?.billing === "string" ? body.billing : undefined,
      departmentKey: typeof body?.departmentKey === "string" ? body.departmentKey : undefined,
      defaultAmount: body?.defaultAmount,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : undefined,
      includeTest,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette service";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
