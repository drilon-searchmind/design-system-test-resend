import { requireAdmin } from "@/lib/server/require-admin";
import { NextResponse } from "next/server";

import { createAdminResource, isAdminResource, listAdminResource } from "@/lib/server/crm-crud";
import { parseTestFilter } from "@/lib/server/test-data-filter";

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ resource: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { resource } = await ctx.params;
  if (!isAdminResource(resource)) {
    return NextResponse.json({ error: "Ukendt ressource" }, { status: 404 });
  }

  const testFilter = parseTestFilter(req.nextUrl.searchParams.get("testFilter"));
  const result = await listAdminResource(resource, { testFilter });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ items: result.items });
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ resource: string }> }} ctx
 */
export async function POST(req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { resource } = await ctx.params;
  if (!isAdminResource(resource)) {
    return NextResponse.json({ error: "Ukendt ressource" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await createAdminResource(resource, body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }
  return NextResponse.json({ item: result.item }, { status: 201 });
}
