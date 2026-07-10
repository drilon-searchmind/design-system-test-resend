import { NextResponse } from "next/server";

import { requireSession } from "@/lib/server/require-session";
import { deleteKnowledgeArticle, fetchKnowledgeArticleBySlug, updateKnowledgeArticle } from "@/lib/server/knowledge-data";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ slug: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { slug } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const article = await fetchKnowledgeArticleBySlug(slug, { includeTest });
    if (!article) return NextResponse.json({ error: "Artikel findes ikke" }, { status: 404 });
    return NextResponse.json({ article });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke hente artikel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ slug: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { slug } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const body = await req.json();
    const result = await updateKnowledgeArticle(slug, {
      includeTest,
      title: typeof body?.title === "string" ? body.title : undefined,
      summary: typeof body?.summary === "string" ? body.summary : undefined,
      bodyMd: typeof body?.bodyMd === "string" ? body.bodyMd : undefined,
      sectionId: typeof body?.sectionId === "string" ? body.sectionId : undefined,
      published: typeof body?.published === "boolean" ? body.published : undefined,
      audience: typeof body?.audience === "string" ? body.audience : undefined,
      featured: typeof body?.featured === "boolean" ? body.featured : undefined,
      icon: body?.icon === null || typeof body?.icon === "string" ? body.icon : undefined,
      headerImageUrl:
        body?.headerImageUrl === null || typeof body?.headerImageUrl === "string" ? body.headerImageUrl : undefined,
      tags: Array.isArray(body?.tags) ? body.tags.map(String) : undefined,
      archived: typeof body?.archived === "boolean" ? body.archived : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke opdatere artikel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ slug: string }> }} ctx
 */
export async function DELETE(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { slug } = await ctx.params;
  const includeTest = req.nextUrl.searchParams.get("includeTest") === "1";

  try {
    const result = await deleteKnowledgeArticle(slug, { includeTest });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke slette artikel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
