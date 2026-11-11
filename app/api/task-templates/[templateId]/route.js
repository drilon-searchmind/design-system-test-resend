import { readIncludeTest } from "@/lib/server/include-test";
import { NextResponse } from "next/server";

import {
  deleteTaskTemplateMongo,
  fetchTemplateDetailBundle,
  updateTaskTemplateMongo,
} from "@/lib/server/task-templates-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const bundle = await fetchTemplateDetailBundle({
      templateKeyOrId: templateId,
      includeTest,
    });
    if (bundle && typeof bundle === "object" && "error" in bundle && bundle.error) {
      return NextResponse.json({ error: bundle.error }, { status: bundle.status ?? 400 });
    }
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente skabelonen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateId: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  try {
    const res = await updateTaskTemplateMongo(templateId, includeTest, body);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere skabelonen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ templateId: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { templateId } = await ctx.params;
  const includeTest = readIncludeTest(req);

  try {
    const res = await deleteTaskTemplateMongo(templateId, includeTest);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette skabelonen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
