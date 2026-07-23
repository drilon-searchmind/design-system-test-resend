import { createHash, randomBytes, randomInt } from "node:crypto";

import { env } from "@/lib/env";

/** @param {number} [bytes] */
export function generateContractSigningToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** @param {string} token */
export function isValidContractSigningToken(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(token.trim());
}

/** 6-digit numeric access code for the signing page */
export function generateContractAccessCode() {
  return String(randomInt(100000, 1000000));
}

/** @param {string} code */
export function hashContractAccessCode(code) {
  const normalized = String(code ?? "").trim();
  return createHash("sha256").update(`contract-sign:${normalized}`).digest("hex");
}

/**
 * @param {string} code
 * @param {string} hash
 */
export function verifyContractAccessCode(code, hash) {
  if (!code || !hash) return false;
  const computed = hashContractAccessCode(code);
  if (computed.length !== hash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i += 1) {
    mismatch |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return mismatch === 0;
}

/** @param {string} documentBodyMd */
export function hashContractDocument(documentBodyMd) {
  return createHash("sha256").update(String(documentBodyMd ?? ""), "utf8").digest("hex");
}

/** @param {string} token */
export function buildContractSigningUrl(token) {
  const base = String(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/contracts/s/${encodeURIComponent(token.trim())}`;
}

/** Default invite lifetime after send (30 days) */
export const CONTRACT_SIGNING_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CONTRACT_SIGNING_CONSENT_TEXT =
  "Jeg bekræfter, at jeg er berettiget til at indgå denne aftale på vegne af virksomheden, at jeg har læst og forstået vilkårene, og at min elektroniske underskrift er juridisk bindende.";
