/**
 * Central env access. Optionally swap for @t3-oss/env-nextjs or Zod parsing later.
 * Never expose secrets to the client — use NEXT_PUBLIC_* only for safe values.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV,
  /** Site URL — e.g. https://app.example.com */
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Auth.js / NextAuth signing secret (AUTH_SECRET or NEXTAUTH_SECRET). */
  AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  /** MongoDB connection (server-only). */
  MONGODB_URI: process.env.MONGODB_URI,
  /** Google workspace SSO (server-only). */
  SSO_GOOGLE_CLIENT_ID: process.env.SSO_GOOGLE_CLIENT_ID,
  SSO_GOOGLE_CLIENT_SECRET: process.env.SSO_GOOGLE_CLIENT_SECRET,
  /** Database URL (server-only) — optional if you use Mongo only. */
  DATABASE_URL: process.env.DATABASE_URL,
  /** Stripe (server-only). */
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  /** Cron / webhook shared secrets — rotate in prod. */
  CRON_SECRET: process.env.CRON_SECRET,
  /** Postmark transactional email (server-only). */
  POSTMARK_API_TOKEN: process.env.POSTMARK_API_TOKEN,
  POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL ?? "noreply@searchmind.dk",
};
