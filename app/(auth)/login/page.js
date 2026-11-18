import { GoogleSignInForm } from "@/components/auth/google-sign-in-form";
import { hasGoogleOAuth } from "@/auth";
import { sanitizeLoginCallbackUrl } from "@/lib/auth/callback-url";

export const metadata = { title: "Sign in · Searchmind 1337 OS" };

export default async function LoginPage({ searchParams }) {
  const resolved = await Promise.resolve(searchParams);
  const rawError = resolved?.error;
  const error = typeof rawError === "string" ? rawError : undefined;
  const rawCb = resolved?.callbackUrl;
  const callbackUrl = sanitizeLoginCallbackUrl(
    typeof rawCb === "string" ? rawCb : undefined,
  );

  return (
    <GoogleSignInForm
      error={error}
      callbackUrl={callbackUrl}
      devAuthOnly={!hasGoogleOAuth}
    />
  );
}
