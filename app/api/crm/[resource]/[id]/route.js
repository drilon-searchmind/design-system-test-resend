import { requireAdmin } from "@/lib/server/require-admin";
import { NextResponse } from "next/server";

import {
  deleteAdminResource,
  getAdminResource,
  isAdminResource,
  updateAdminResource,
} from "@/lib/server/crm-crud";

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ resource: string; id: string }> }} ctx
 */
export async function GET(_req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { resource, id } = await ctx.params;
  if (!isAdminResource(resource)) {
    return NextResponse.json({ error: "Ukendt ressource" }, { status: 404 });
  }

  const result = await getAdminResource(resource, id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ item: result.item });
}

/**
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ resource: string; id: string }> }} ctx
 */
export async function PATCH(req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { resource, id } = await ctx.params;
  if (!isAdminResource(resource)) {
    return NextResponse.json({ error: "Ukendt ressource" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await updateAdminResource(resource, id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }
  return NextResponse.json({ item: result.item });
}

/**
 * @param {import('next/server').NextRequest} _req
 * @param {{ params: Promise<{ resource: string; id: string }> }} ctx
 */
export async function DELETE(_req, ctx) {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  const { resource, id } = await ctx.params;
  if (!isAdminResource(resource)) {
    return NextResponse.json({ error: "Ukendt ressource" }, { status: 404 });
  }

  const result = await deleteAdminResource(resource, id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ ok: true });
}
