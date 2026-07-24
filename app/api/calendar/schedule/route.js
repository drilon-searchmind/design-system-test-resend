import { NextResponse } from "next/server";

import {
  createCalendarSlot,
  deleteCalendarSlot,
  updateCalendarSlot,
} from "@/lib/server/calendar-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function POST(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  const start = typeof body.start === "string" ? body.start : "";
  const end = typeof body.end === "string" ? body.end : "";

  if (!taskId) return NextResponse.json({ error: "taskId er påkrævet" }, { status: 400 });
  if (!start) return NextResponse.json({ error: "start er påkrævet" }, { status: 400 });

  try {
    const res = await createCalendarSlot(taskId, includeTest, { start, end }, authResult.session);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette kalenderblok";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 */
export async function PATCH(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
  const start = typeof body.start === "string" ? body.start : "";
  const end = typeof body.end === "string" ? body.end : "";
  const slotIndex = typeof body.slotIndex === "number" ? body.slotIndex : undefined;

  if (!taskId) return NextResponse.json({ error: "taskId er påkrævet" }, { status: 400 });
  if (!slotId) return NextResponse.json({ error: "slotId er påkrævet" }, { status: 400 });
  if (!start) return NextResponse.json({ error: "start er påkrævet" }, { status: 400 });

  try {
    const res = await updateCalendarSlot(
      taskId,
      slotId,
      includeTest,
      { start, end },
      slotIndex,
      authResult.session,
    );
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere planlægning";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 */
export async function DELETE(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    body = {};
  }

  const taskId =
    (typeof body.taskId === "string" ? body.taskId.trim() : "") ||
    req.nextUrl.searchParams.get("taskId")?.trim() ||
    "";
  const slotId =
    (typeof body.slotId === "string" ? body.slotId.trim() : "") ||
    req.nextUrl.searchParams.get("slotId")?.trim() ||
    "";
  const slotIndex = typeof body.slotIndex === "number" ? body.slotIndex : undefined;

  if (!taskId) return NextResponse.json({ error: "taskId er påkrævet" }, { status: 400 });
  if (!slotId) return NextResponse.json({ error: "slotId er påkrævet" }, { status: 400 });

  try {
    const res = await deleteCalendarSlot(taskId, slotId, includeTest, slotIndex, authResult.session);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette kalenderblok";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
