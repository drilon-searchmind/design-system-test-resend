import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { assigneeMemberKeyForDbUser } from "@/lib/server/session-team-member";
import { createKnowledgeArticle, fetchKnowledgeBundle } from "@/lib/server/knowledge-data";

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const bundle = await fetchKnowledgeBundle({ includeTest });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente vidensbase";
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
    const authorMemberKey = await assigneeMemberKeyForDbUser(authResult.session);
    const result = await createKnowledgeArticle({
      includeTest,
      authorMemberKey: authorMemberKey || undefined,
      title: typeof body?.title === "string" ? body.title : "",
      summary: typeof body?.summary === "string" ? body.summary : "",
      bodyMd: typeof body?.bodyMd === "string" ? body.bodyMd : "",
      sectionId: typeof body?.sectionId === "string" ? body.sectionId : "",
      published: typeof body?.published === "boolean" ? body.published : true,
      audience: typeof body?.audience === "string" ? body.audience : "internal",
      featured: typeof body?.featured === "boolean" ? body.featured : false,
      icon: typeof body?.icon === "string" ? body.icon : null,
      headerImageUrl:
        typeof body?.headerImageUrl === "string" ? body.headerImageUrl : body?.headerImageUrl === null ? null : undefined,
      tags: Array.isArray(body?.tags) ? body.tags.map(String) : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke oprette artikel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
