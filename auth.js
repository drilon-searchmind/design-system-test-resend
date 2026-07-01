import { cookies } from "next/headers";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isGoogleWorkspaceSsoAllowed, normalizeEmail } from "@/lib/auth/workspace-sso";
import { accessTierFromUserDoc, syncGoogleOAuthUser } from "@/lib/auth/sync-oauth-user";
import { ACCESS_TIERS } from "@/lib/constants/access-tiers";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { env } from "@/lib/env";

/** When set, demo dev-session auth returns null (Log ud). */
const DEMO_SIGNED_OUT_COOKIE = "apex-demo-signed-out";

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

export const hasGoogleOAuth = Boolean(
  env.SSO_GOOGLE_CLIENT_ID && env.SSO_GOOGLE_CLIENT_SECRET,
);

const authSecret =
  env.AUTH_SECRET ??
  (hasGoogleOAuth ? undefined : "dev-auth-secret-not-for-production");

async function isDemoSignedOut() {
  const store = await cookies();
  return store.get(DEMO_SIGNED_OUT_COOKIE)?.value === "1";
}

async function getDevSessionPayload() {
  if (await isDemoSignedOut()) return null;
  return DEV_SESSION;
}

async function markSignedOut() {
  const store = await cookies();
  store.set(DEMO_SIGNED_OUT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

async function clearSignedOut() {
  const store = await cookies();
  store.delete(DEMO_SIGNED_OUT_COOKIE);
}

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

function authRouteAction(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function isSignInOrCallbackPath(pathname) {
  return pathname.includes("/signin") || pathname.includes("/callback");
}

const nextAuth = hasGoogleOAuth
  ? NextAuth({
      secret: authSecret,
      trustHost: true,
      providers: [
        Google({
          clientId: env.SSO_GOOGLE_CLIENT_ID,
          clientSecret: env.SSO_GOOGLE_CLIENT_SECRET,
        }),
      ],
      callbacks: {
        async signIn({ user, account }) {
          if (account?.provider === "google") {
            const email = normalizeEmail(user.email);
            if (!isGoogleWorkspaceSsoAllowed(email)) {
              return "/login?error=forbidden_workspace";
            }
            await connectDb();
            const provisioned = await User.findOne({ email }).select("_id").lean();
            if (!provisioned) {
              return "/login?error=not_provisioned";
            }
          }
          await clearSignedOut();
          return true;
        },
        async jwt({ token, user, account }) {
          if (account?.provider === "google" && user?.email && account.providerAccountId) {
            const mongoUserId = await syncGoogleOAuthUser({
              email: user.email,
              name: user.name,
              image: user.image,
              googleSubject: account.providerAccountId,
            });
            if (mongoUserId) {
              token.userId = mongoUserId;
              await connectDb();
              const dbUser = await User.findById(mongoUserId).select("accessTier").lean();
              if (dbUser) token.accessTier = accessTierFromUserDoc(dbUser);
            }
          }
          if (user && !token.accessTier) {
            token.accessTier = ACCESS_TIERS.INTERNAL_FULL;
          }
          return token;
        },
        async session({ session, token }) {
          if (session.user) {
            session.user.id =
              typeof token.userId === "string" ? token.userId : (token.sub ?? session.user.id);
            session.user.accessTier =
              /** @type {string} */ (token.accessTier) ?? ACCESS_TIERS.INTERNAL_FULL;

            if (typeof token.userId === "string" && token.userId) {
              await connectDb();
              const dbUser = await User.findById(token.userId).select("name email image accessTier").lean();
              if (dbUser) {
                if (dbUser.name) session.user.name = String(dbUser.name);
                if (dbUser.email) session.user.email = String(dbUser.email);
                session.user.image = dbUser.image ? String(dbUser.image) : null;
                session.user.accessTier = accessTierFromUserDoc(dbUser);
              }
            }
          }
          return session;
        },
      },
      pages: {
        signIn: "/login",
        error: "/login",
      },
    })
  : null;

const nextHandlers = nextAuth?.handlers;

export const handlers = {
  GET: async (request) => {
    const pathname = new URL(request.url).pathname;
    const action = authRouteAction(pathname);

    if (!hasGoogleOAuth) {
      if (action === "signout") {
        await markSignedOut();
        return jsonResponse({ url: "/" });
      }
      return jsonResponse(await getDevSessionPayload());
    }

    return nextHandlers.GET(request);
  },
  POST: async (request) => {
    const pathname = new URL(request.url).pathname;
    const action = authRouteAction(pathname);

    if (!hasGoogleOAuth) {
      if (action === "signout") {
        await markSignedOut();
        return jsonResponse({ url: "/" });
      }
      if (isSignInOrCallbackPath(pathname)) {
        await clearSignedOut();
        return jsonResponse({ url: "/pulse" });
      }
      return jsonResponse({});
    }

    return nextHandlers.POST(request);
  },
};

export async function auth() {
  if (!hasGoogleOAuth) {
    return getDevSessionPayload();
  }
  return nextAuth.auth();
}

export async function signIn(...args) {
  if (!hasGoogleOAuth) {
    await clearSignedOut();
    return;
  }
  return nextAuth.signIn(...args);
}

export async function signOut(...args) {
  await markSignedOut();
  if (!hasGoogleOAuth) {
    return;
  }
  return nextAuth.signOut(...args);
}
