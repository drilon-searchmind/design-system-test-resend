import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Next.js App Router catch-all for Auth.js.
 * Pass both request + context so Auth.js / Next 16 receive params if needed.
 */
export async function GET(request, context) {
  try {
    return await handlers.GET(request, context);
  } catch (err) {
    console.error("[api/auth GET]", err);
    return Response.json(
      { error: "auth_handler_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request, context) {
  try {
    return await handlers.POST(request, context);
  } catch (err) {
    console.error("[api/auth POST]", err);
    return Response.json(
      { error: "auth_handler_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
