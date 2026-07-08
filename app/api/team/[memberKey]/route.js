import { NextResponse } from "next/server";

import { patchTeamMemberDepartment } from "@/lib/server/team-member-dept-data";
import { requireSession } from "@/lib/server/require-session";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ memberKey: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { memberKey: memberKeyEncoded } = await ctx.params;
  const memberKey = decodeURIComponent(memberKeyEncoded ?? "");
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await patchTeamMemberDepartment(memberKey, body, { includeTest });
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere afdeling";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
