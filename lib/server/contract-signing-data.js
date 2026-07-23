import mongoose from "mongoose";

import {
  CONTRACT_SIGNING_CONSENT_TEXT,
  hashContractDocument,
  isValidContractSigningToken,
  verifyContractAccessCode,
} from "@/lib/contracts/signing-token";
import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import ContractSignature from "@/lib/db/models/contract-signature";
import ContractSigningInvite from "@/lib/db/models/contract-signing-invite";
import { connectDb } from "@/lib/db/mongoose";

/** @typedef {Record<string, unknown>} RawDoc */

/**
 * @param {import('next/server').NextRequest | Request} req
 */
export function extractClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 128);
  return "";
}

/**
 * @param {string} token
 */
async function loadInviteByToken(token) {
  if (!isValidContractSigningToken(token)) return null;
  await connectDb();
  const invite = await ContractSigningInvite.findOne({ token: token.trim() });
  return invite;
}

/**
 * @param {InstanceType<typeof ContractSigningInvite>} invite
 */
function invitePublicStatus(invite) {
  if (!invite) return "invalid";
  if (invite.status === "revoked") return "invalid";
  if (invite.status === "signed" || invite.signedAt) return "signed";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return "expired";
  if (invite.status === "unlocked") return "unlocked";
  return "pending";
}

/**
 * @param {string} token
 */
export async function getContractSigningSession(token) {
  const invite = await loadInviteByToken(token);
  if (!invite) {
    return { status: /** @type {const} */ ("invalid") };
  }

  const status = invitePublicStatus(invite);
  const client = await Client.findById(invite.clientId).select("name").lean();
  const contract = await Contract.findById(invite.contractId)
    .select("label type noticeDays version")
    .lean();

  const base = {
    status,
    clientName: client && typeof client === "object" ? String(client.name ?? "Kunden") : "Kunden",
    contractLabel:
      contract && typeof contract === "object" ?
        String(contract.label ?? "Samarbejdsaftale")
      : "Samarbejdsaftale",
    signerEmail: String(invite.signerEmail ?? ""),
    signerNameHint: typeof invite.signerName === "string" ? invite.signerName : "",
    expiresAt: invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : undefined,
  };

  if (status === "unlocked") {
    return {
      ...base,
      documentBodyMd: String(invite.documentBodyMd ?? ""),
      consentText: CONTRACT_SIGNING_CONSENT_TEXT,
    };
  }

  return base;
}

/**
 * @param {{ token: string; accessCode: string }} input
 */
export async function unlockContractSigningSession(input) {
  const invite = await loadInviteByToken(input.token);
  if (!invite) return { error: "Ugyldigt link", status: 404 };

  const status = invitePublicStatus(invite);
  if (status === "signed") return { error: "Aftalen er allerede underskrevet", status: 409 };
  if (status === "expired") return { error: "Linket er udløbet", status: 410 };
  if (status === "invalid") return { error: "Ugyldigt link", status: 404 };

  if (!verifyContractAccessCode(input.accessCode, String(invite.accessCodeHash ?? ""))) {
    return { error: "Forkert adgangskode", status: 401 };
  }

  invite.status = "unlocked";
  invite.unlockedAt = new Date();
  await invite.save();

  return getContractSigningSession(input.token);
}

/**
 * @param {{
 *   token: string;
 *   signerName: string;
 *   signerTitle?: string;
 *   signerCompany?: string;
 *   consentAccepted: boolean;
 *   ipAddress?: string;
 *   userAgent?: string;
 * }} input
 */
export async function submitContractSignature(input) {
  const invite = await loadInviteByToken(input.token);
  if (!invite) return { error: "Ugyldigt link", status: 404 };

  const status = invitePublicStatus(invite);
  if (status === "signed") return { error: "Aftalen er allerede underskrevet", status: 409 };
  if (status === "expired") return { error: "Linket er udløbet", status: 410 };
  if (status !== "unlocked") {
    return { error: "Indtast adgangskoden først", status: 403 };
  }

  const signerName = String(input.signerName ?? "").trim();
  if (signerName.length < 2) return { error: "Angiv fulde navn", status: 400 };
  if (!input.consentAccepted) {
    return { error: "Du skal acceptere vilkårene for at underskrive", status: 400 };
  }

  const contract = await Contract.findById(invite.contractId);
  if (!contract) return { error: "Kontrakt ikke fundet", status: 404 };

  const documentBodyMd = String(invite.documentBodyMd ?? contract.documentBodyMd ?? "");
  const documentHash = hashContractDocument(documentBodyMd);
  if (documentHash !== String(invite.documentHash ?? "")) {
    return { error: "Dokumentet er ændret siden udsendelse. Bed om et nyt link.", status: 409 };
  }

  const signedAt = new Date();
  const consentText = CONTRACT_SIGNING_CONSENT_TEXT;

  const signature = await ContractSignature.create({
    contractId: contract._id,
    inviteId: invite._id,
    clientId: invite.clientId,
    signerName,
    signerEmail: String(invite.signerEmail ?? "").toLowerCase(),
    signerTitle: typeof input.signerTitle === "string" ? input.signerTitle.trim() : "",
    signerCompany: typeof input.signerCompany === "string" ? input.signerCompany.trim() : "",
    signedAt,
    ipAddress: typeof input.ipAddress === "string" ? input.ipAddress.slice(0, 128) : "",
    userAgent: typeof input.userAgent === "string" ? input.userAgent.slice(0, 512) : "",
    consentText,
    consentAccepted: true,
    documentHash,
    documentBodyMd,
    contractVersion: typeof contract.version === "number" ? contract.version : 1,
    isTest: Boolean(contract.isTest),
  });

  invite.status = "signed";
  invite.signedAt = signedAt;
  invite.signatureId = signature._id;
  await invite.save();

  contract.status = "active";
  contract.signedAt = signedAt;
  contract.signedBy = signerName;
  contract.signedByName = signerName;
  contract.signedByEmail = String(invite.signerEmail ?? "").toLowerCase();
  contract.signedByTitle =
    typeof input.signerTitle === "string" ? input.signerTitle.trim() : "";
  contract.signedByCompany =
    typeof input.signerCompany === "string" ? input.signerCompany.trim() : "";
  contract.signatureIp = typeof input.ipAddress === "string" ? input.ipAddress.slice(0, 128) : "";
  contract.signatureUserAgent =
    typeof input.userAgent === "string" ? input.userAgent.slice(0, 512) : "";
  contract.signatureDocumentHash = documentHash;
  contract.signatureId = signature._id;
  contract.consentAcceptedAt = signedAt;
  contract.documentBodyMd = documentBodyMd;
  if (!contract.startDate) contract.startDate = signedAt;
  await contract.save();

  return {
    ok: true,
    status: "signed",
    signedAt: signedAt.toISOString(),
    signerName,
  };
}

/**
 * @param {{
 *   contractId: string;
 *   action: 'pause' | 'close' | 'activate';
 *   includeTest?: boolean;
 * }} input
 */
export async function updateContractLifecycle(input) {
  await connectDb();
  const id = String(input.contractId ?? "").trim();
  /** @type {RawDoc[]} */
  const keyOrId = [];
  if (mongoose.Types.ObjectId.isValid(id)) keyOrId.push({ _id: new mongoose.Types.ObjectId(id) });
  keyOrId.push({ key: id });

  const contract = await Contract.findOne({ $or: keyOrId });
  if (!contract) return { error: "Ikke fundet", status: 404 };

  if (input.action === "pause") {
    contract.status = "paused";
  } else if (input.action === "close") {
    contract.status = "ended";
    if (!contract.endDate) contract.endDate = new Date();
  } else if (input.action === "activate") {
    if (!contract.signedAt) {
      return { error: "Kontrakten skal være underskrevet før den kan aktiveres", status: 400 };
    }
    contract.status = "active";
  } else {
    return { error: "Ukendt handling", status: 400 };
  }

  await contract.save();
  return { ok: true, status: contract.status };
}

/**
 * Renew: end current (or keep notice), clone as new pending version, return new contract id for send.
 * @param {{
 *   contractId: string;
 *   documentBodyMd?: string;
 *   label?: string;
 *   value?: number;
 *   includeTest?: boolean;
 * }} input
 */
export async function renewContract(input) {
  await connectDb();
  const id = String(input.contractId ?? "").trim();
  /** @type {RawDoc[]} */
  const keyOrId = [];
  if (mongoose.Types.ObjectId.isValid(id)) keyOrId.push({ _id: new mongoose.Types.ObjectId(id) });
  keyOrId.push({ key: id });

  const previous = await Contract.findOne({ $or: keyOrId });
  if (!previous) return { error: "Ikke fundet", status: 404 };

  previous.status = "ended";
  previous.endDate = previous.endDate ?? new Date();
  await previous.save();

  const nextVersion = (typeof previous.version === "number" ? previous.version : 1) + 1;
  const slug = String(previous.clientSlug ?? "");
  const key = `ctr-${slug || "client"}-v${nextVersion}-${Date.now().toString(36)}`;

  const documentBodyMd =
    typeof input.documentBodyMd === "string" && input.documentBodyMd.trim() ?
      input.documentBodyMd.trim()
    : String(previous.documentBodyMd ?? "");

  const renewed = await Contract.create({
    key,
    clientId: previous.clientId,
    clientSlug: previous.clientSlug,
    type: previous.type,
    label:
      typeof input.label === "string" && input.label.trim() ?
        input.label.trim()
      : `${String(previous.label ?? "Aftale")} (v${nextVersion})`,
    value:
      typeof input.value === "number" && Number.isFinite(input.value) ?
        input.value
      : previous.value,
    currency: previous.currency,
    startDate: new Date(),
    renewalDate: previous.renewalDate,
    status: "draft",
    termsSummary: documentBodyMd.slice(0, 280),
    documentBodyMd,
    noticeDays: previous.noticeDays,
    templateId: previous.templateId,
    version: nextVersion,
    previousContractId: previous._id,
    isTest: Boolean(previous.isTest),
  });

  return {
    ok: true,
    previousContractId: String(previous._id),
    contractId: String(renewed._id),
    contractKey: key,
    version: nextVersion,
    requiresResign: true,
  };
}
