import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import {
  createTaskTemplateMongo,
  fetchTemplatesPortfolio,
} from "@/lib/server/task-templates-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = readIncludeTest(req);

  try {
    const bundle = await fetchTemplatesPortfolio({ includeTest });
    return NextResponse.json(bundle);
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

  const includeTest = readIncludeTest(req);

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  try {
    const res = await createTaskTemplateMongo(body, includeTest);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette skabelonen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
