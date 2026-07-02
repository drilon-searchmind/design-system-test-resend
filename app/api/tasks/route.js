import { NextResponse } from "next/server";

import { normalizeReportPeriod } from "@/lib/crm/report-period";
import { assigneeMemberKeyForDbUser } from "@/lib/server/session-team-member";
import { createTaskMongo, fetchTasksPortfolio } from "@/lib/server/tasks-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  const period = normalizeReportPeriod({
    year: Number.isFinite(year) ? year : undefined,
    month: Number.isFinite(month) ? month : undefined,
  });

  try {
    const mineAssigneeKey = await assigneeMemberKeyForDbUser(authResult.session);
    const bundle = await fetchTasksPortfolio({ includeTest, mineAssigneeKey, ...period });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente opgaver";
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

  /** @type {Record<string, unknown>} */
  let body = {};
  try {
    body = /** @type {Record<string, unknown>} */ (await req.json());
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  try {
    const res = await createTaskMongo(body, includeTest, authResult.session);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status ?? 400 });
    }
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette opgave";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
