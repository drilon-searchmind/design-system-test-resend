"use client";

import { signIn } from "next-auth/react";

import { AuthCard } from "@/components/layout/auth-card";

/** @typedef {{ error?: string; callbackUrl: string; devAuthOnly?: boolean }} GoogleSignInFormProps */

/** @type {Record<string,string>} */
const KNOWN_MESSAGES = {
  forbidden_workspace:
    "Sign-in is restricted to Searchmind (@searchmind.dk) Google accounts for now.",
  unsupported: "This sign-in method is not available.",
  OAuthSignin:
    "We could not start Google sign-in. Check credentials and authorized redirect URIs.",
  OAuthCallback: "Something went wrong after Google redirected back. Try again.",
  OAuthAccountAlreadyLinked:
    "This Google account is already linked to another sign-in route.",
  not_provisioned:
    "Your account is not provisioned yet. Contact an admin if you should have access.",
};

/** @param {GoogleSignInFormProps} props */
export function GoogleSignInForm({ error, callbackUrl, devAuthOnly = false }) {
  async function handleGoogle() {
    await signIn("google", { callbackUrl, redirect: true });
  }

  async function handleDevContinue() {
    const res = await fetch("/api/auth/signin/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (res.ok) {
      window.location.assign(callbackUrl);
      return;
    }
    window.location.assign(callbackUrl);
  }

  /** @type {string | null} */
  let message = null;
  if (typeof error === "string" && error) {
    message = KNOWN_MESSAGES[error] ?? "Sign-in failed. Please try again.";
  }

  if (devAuthOnly) {
    return (
      <AuthCard
        title="Development access"
        subtitle="Google SSO is not configured. Continue with the local demo session."
      >
        <div className="flex flex-col gap-6">
          {message ? (
            <p
              className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-fg-muted"
              role="alert"
            >
              {message}
            </p>
          ) : null}
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-solid-cta-bg px-4 py-3.5 text-base font-medium text-solid-cta-fg transition hover:bg-solid-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => void handleDevContinue()}
          >
            Continue to workspace
            <span aria-hidden>→</span>
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in with Google"
      subtitle="Use your Searchmind workspace account (@searchmind.dk)."
    >
      <div className="flex flex-col gap-6">
        {message ? (
          <p
            className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-fg-muted"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-solid-cta-bg px-4 py-3.5 text-base font-medium text-solid-cta-fg transition hover:bg-solid-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => void handleGoogle()}
        >
          Continue with Google
          <span aria-hidden>→</span>
        </button>
        <p className="text-center text-xs uppercase tracking-[0.08em] text-fg-soft">
          Workspace SSO · @searchmind.dk
        </p>
      </div>
    </AuthCard>
  );
}
