import { NextResponse } from "next/server";

/**
 * Next.js 16: `middleware` → `proxy` (nodejs runtime).
 * Pass-through for now; keep matcher narrow so API routes are untouched.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
