import { cookies } from "next/headers";

export const INCLUDE_TEST_COOKIE = "crm_include_test";

/**
 * Skal testdata (isTest=true, fx testkunden) tages med? Styres af Indstillinger (cookie),
 * kan overstyres pr. kald med `?includeTest=1|0`.
 * @param {{ nextUrl: URL; cookies: { get(name: string): { value: string } | undefined } }} req
 */
export function readIncludeTest(req) {
  const q = req.nextUrl.searchParams.get("includeTest");
  if (q === "1") return true;
  if (q === "0") return false;
  return req.cookies.get(INCLUDE_TEST_COOKIE)?.value === "1";
}

/** Samme cookie som `readIncludeTest`, til server-sider der ikke har et request-objekt. */
export async function readIncludeTestCookie() {
  const store = await cookies();
  return store.get(INCLUDE_TEST_COOKIE)?.value === "1";
}
