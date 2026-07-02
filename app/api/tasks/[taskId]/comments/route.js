import { NextResponse } from "next/server";

import { createTaskComment, fetchTaskComments } from "@/lib/server/task-comments-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ taskId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { taskId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const res = await fetchTaskComments(taskId, includeTest);
    if (res && typeof res === "object" && "error" in res && typeof res.error === "string") {
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente kommentarer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ taskId: string }> }} ctx
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { taskId } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml : "";

  try {
    const res = await createTaskComment(authResult.session, taskId, includeTest, { bodyHtml });
    if (res && typeof res === "object" && "error" in res && typeof res.error === "string") {
      return NextResponse.json({ error: res.error }, { status: typeof res.status === "number" ? res.status : 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette kommentar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
