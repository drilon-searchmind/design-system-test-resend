import { NextResponse } from "next/server";

import { readIncludeTest } from "@/lib/server/include-test";
import { requireSession } from "@/lib/server/require-session";
import { addFileSources, addTextSource, addUrlSource } from "@/lib/server/tov-data";

/**
 * Tilføj materiale. Enten multipart (`files`) eller JSON: { url } | { text, name? }.
 * Filer sendes én ad gangen fra klienten (body-grænse ~10 MB).
 */
export async function POST(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;
  const { clientId } = await ctx.params;
  const includeTest = readIncludeTest(req);
  const meta = { by: authResult.session.user?.name ?? authResult.session.user?.email ?? undefined };

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const files = await Promise.all(
        form
          .getAll("files")
          .filter((f) => typeof f === "object" && "arrayBuffer" in f)
          .map(async (f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
            buffer: Buffer.from(await f.arrayBuffer()),
          })),
      );
      if (!files.length) return NextResponse.json({ error: "Ingen filer modtaget" }, { status: 400 });
      const result = await addFileSources(clientId, includeTest, files, meta);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      if (result.added === 0 && result.errors.length) {
        return NextResponse.json({ error: result.errors.join(" · ") }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    const body = await req.json();
    const result =
      typeof body?.url === "string" ? await addUrlSource(clientId, includeTest, body.url, meta)
      : await addTextSource(clientId, includeTest, body ?? {}, meta);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fejl" }, { status: 500 });
  }
}
