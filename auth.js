import { ACCESS_TIERS } from "@/lib/constants/access-tiers";

const DEV_SESSION = {
  user: {
    id: "dev-user",
    email: "dev@searchmind.dk",
    name: "Dev User",
    image: null,
    accessTier: ACCESS_TIERS.INTERNAL_FULL,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export async function auth() {
  return DEV_SESSION;
}

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

export const handlers = {
  // Return a valid session payload so next-auth's SessionProvider parses cleanly in the demo.
  GET: () => jsonResponse(DEV_SESSION),
  POST: () => jsonResponse({}),
};

export function signIn() {}
export function signOut() {}
