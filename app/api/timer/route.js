import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getTimerForSession, startTimer, stopTimer } from "@/lib/server/timer-controller";

export async function GET() {
  const session = await auth();
  const r = await getTimerForSession(session);
  return NextResponse.json({
    active: r.active ?? null,
    clientsPicklist: Array.isArray(r.clientsPicklist) ? r.clientsPicklist : [],
    tasksPicklist: Array.isArray(r.tasksPicklist) ? r.tasksPicklist : [],
    canStartTimer: r.canStartTimer !== false,
  });
}

export async function POST(req) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "start") {
    const r = await startTimer(session, body);
    if ("error" in r && r.error) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
    return NextResponse.json({ active: r.active });
  }

  if (action === "stop") {
    const r = await stopTimer(session);
    if ("error" in r && r.error) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
    return NextResponse.json({ ok: r.ok, durationMinutes: r.durationMinutes });
  }

  return NextResponse.json({ error: "Ugyldig action" }, { status: 400 });
}
