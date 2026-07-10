import { randomBytes } from "node:crypto";

import { env } from "@/lib/env";

/** @param {number} [bytes] */
export function generateNpsSurveyToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** @param {string} token */
export function isValidNpsSurveyToken(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(token.trim());
}

/** @param {string} token */
export function buildNpsSurveyUrl(token) {
  const base = String(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/nps/s/${encodeURIComponent(token.trim())}`;
}

/** Default invite lifetime after send */
export const NPS_INVITE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
