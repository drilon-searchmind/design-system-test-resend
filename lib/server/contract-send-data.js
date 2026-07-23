import mongoose from "mongoose";

import {
  buildContractSigningUrl,
  CONTRACT_SIGNING_INVITE_TTL_MS,
  generateContractAccessCode,
  generateContractSigningToken,
  hashContractAccessCode,
  hashContractDocument,
} from "@/lib/contracts/signing-token";
import { renderContractTemplateText } from "@/lib/email/contract-template-render";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import Contract from "@/lib/db/models/contract";
import ContractSigningInvite from "@/lib/db/models/contract-signing-invite";
import ContractTemplate from "@/lib/db/models/contract-template";
import { connectDb } from "@/lib/db/mongoose";
import {
  ensureDefaultContractTemplate,
  resolveDefaultContractTemplate,
} from "@/lib/server/contract-templates-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @typedef {Record<string, unknown>} RawDoc */

/**
 * @param {string} clientId
 * @param {RawDoc} scope
 */
async function loadContacts(clientId, scope) {
  const docs = await Contact.find(
    /** @type {RawDoc} */ (andQuery(scope, { clientId })),
  )
    .sort({ isPrimary: -1, name: 1 })
    .lean();
  return (Array.isArray(docs) ? docs : []).map((row) => {
    const r = /** @type {RawDoc} */ (row);
    return {
      id: r._id != null ? String(r._id) : "",
      name: String(r.name ?? ""),
      email: typeof r.email === "string" ? r.email.trim().toLowerCase() : "",
      isPrimary: Boolean(r.isPrimary),
    };
  });
}

/**
 * @param {RawDoc} clientDoc
 * @param {string | undefined} contactEmail
 * @param {RawDoc} scope
 */
async function resolveSigner(clientDoc, contactEmail, scope) {
  const contacts = await loadContacts(String(clientDoc._id), scope);
  const wanted = typeof contactEmail === "string" ? contactEmail.trim().toLowerCase() : "";

  if (wanted) {
    const hit = contacts.find((c) => c.email === wanted);
    if (hit?.email) return { email: hit.email, name: hit.name || wanted };
    return { email: wanted, name: wanted.split("@")[0] ?? wanted };
  }

  const primary = contacts.find((c) => c.isPrimary && c.email) ?? contacts.find((c) => c.email);
  if (primary?.email) return { email: primary.email, name: primary.name || primary.email };

  const pc = clientDoc.primaryContact;
  if (pc && typeof pc === "object" && typeof pc.email === "string" && pc.email.trim()) {
    return {
      email: pc.email.trim().toLowerCase(),
      name: typeof pc.name === "string" && pc.name.trim() ? pc.name.trim() : pc.email.trim(),
    };
  }

  return null;
}

/**
 * @param {{
 *   clientId?: string;
 *   clientSlug?: string;
 *   templateKey?: string;
 *   templateId?: string;
 *   label?: string;
 *   type?: string;
 *   value?: number;
 *   currency?: string;
 *   noticeDays?: number;
 *   documentBodyMd?: string;
 *   contactEmail?: string;
 *   startDate?: string;
 *   renewalDate?: string;
 *   includeTest?: boolean;
 * }} input
 */
export async function createAndSendContractForSignature(input) {
  await connectDb();
  await ensureDefaultContractTemplate({ includeTest: input.includeTest });

  const scope = buildIsTestQuery(input.includeTest ? "all" : "production");

  /** @type {RawDoc | null} */
  let clientDoc = null;
  if (input.clientId && mongoose.Types.ObjectId.isValid(String(input.clientId))) {
    clientDoc = /** @type {RawDoc | null} */ (
      await Client.findOne(
        /** @type {RawDoc} */ (andQuery(scope, { _id: input.clientId })),
      ).lean()
    );
  } else if (input.clientSlug) {
    clientDoc = /** @type {RawDoc | null} */ (
      await Client.findOne(
        /** @type {RawDoc} */ (andQuery(scope, { slug: String(input.clientSlug).trim() })),
      ).lean()
    );
  }

  if (!clientDoc) return { error: "Kunde ikke fundet", status: 404 };

  const signer = await resolveSigner(clientDoc, input.contactEmail, scope);
  if (!signer?.email) {
    return {
      error: "Ingen e-mail fundet til underskriver. Tilføj en kontakt på kunden.",
      status: 400,
    };
  }

  /** @type {RawDoc | null} */
  let template = null;
  if (input.templateId && mongoose.Types.ObjectId.isValid(String(input.templateId))) {
    template = /** @type {RawDoc | null} */ (
      await ContractTemplate.findOne(
        /** @type {RawDoc} */ (andQuery(scope, { _id: input.templateId, active: true })),
      ).lean()
    );
  } else if (input.templateKey) {
    template = /** @type {RawDoc | null} */ (
      await ContractTemplate.findOne(
        /** @type {RawDoc} */ (
          andQuery(scope, { key: String(input.templateKey).trim(), active: true })
        ),
      ).lean()
    );
  }
  if (!template) {
    template = await resolveDefaultContractTemplate(/** @type {RawDoc} */ (scope));
  }
  if (!template) return { error: "Ingen kontrakt-skabelon fundet", status: 400 };

  const clientName = String(clientDoc.name ?? "Kunden");
  const label =
    String(input.label ?? "").trim() ||
    String(template.name ?? "Samarbejdsaftale");
  const noticeDays =
    typeof input.noticeDays === "number" && Number.isFinite(input.noticeDays) ?
      input.noticeDays
    : typeof template.defaultNoticeDays === "number" ?
      template.defaultNoticeDays
    : 90;

  const today = new Date().toISOString().slice(0, 10);
  const vars = {
    clientName,
    signerName: signer.name,
    contractLabel: label,
    noticeDays: String(noticeDays),
    today,
    signingUrl: "{{signingUrl}}",
    accessCode: "{{accessCode}}",
  };

  const documentSource =
    typeof input.documentBodyMd === "string" && input.documentBodyMd.trim() ?
      input.documentBodyMd
    : String(template.documentBodyMd ?? "");

  const documentBodyMd = renderContractTemplateText(documentSource, {
    ...vars,
    signingUrl: "",
    accessCode: "",
  });
  const documentHash = hashContractDocument(documentBodyMd);

  const contractType = ["retainer", "project", "one_off", "subscription"].includes(
    String(input.type ?? template.defaultType),
  )
    ? String(input.type ?? template.defaultType)
    : "retainer";

  const slug = String(clientDoc.slug ?? clientDoc._id);
  const key = `ctr-${slug}-${Date.now().toString(36)}`;

  const contract = await Contract.create({
    key,
    clientId: clientDoc._id,
    clientSlug: slug,
    type: contractType,
    label,
    value: typeof input.value === "number" && Number.isFinite(input.value) ? input.value : undefined,
    currency: typeof input.currency === "string" && input.currency.trim() ? input.currency : "DKK",
    startDate: input.startDate ? new Date(input.startDate) : new Date(),
    renewalDate: input.renewalDate ? new Date(input.renewalDate) : undefined,
    status: "pending_signature",
    termsSummary: documentBodyMd.slice(0, 280),
    documentBodyMd,
    noticeDays,
    templateId: template._id,
    version: 1,
    isTest: Boolean(input.includeTest) || Boolean(clientDoc.isTest),
  });

  return sendSigningInviteForContract({
    contractId: String(contract._id),
    contactEmail: signer.email,
    includeTest: input.includeTest,
  });
}

/**
 * @param {{
 *   contractId: string;
 *   contactEmail?: string;
 *   includeTest?: boolean;
 * }} input
 */
export async function sendSigningInviteForContract(input) {
  await connectDb();
  const scope = buildIsTestQuery(input.includeTest ? "all" : "production");

  const id = String(input.contractId ?? "").trim();
  /** @type {RawDoc[]} */
  const keyOrId = [];
  if (mongoose.Types.ObjectId.isValid(id)) keyOrId.push({ _id: new mongoose.Types.ObjectId(id) });
  keyOrId.push({ key: id });

  const contract = await Contract.findOne(
    /** @type {RawDoc} */ (andQuery(scope, { $or: keyOrId })),
  );
  if (!contract) return { error: "Kontrakt ikke fundet", status: 404 };

  const clientDoc = /** @type {RawDoc | null} */ (
    await Client.findOne(
      /** @type {RawDoc} */ (andQuery(scope, { _id: contract.clientId })),
    ).lean()
  );
  if (!clientDoc) return { error: "Kunde ikke fundet", status: 404 };

  const signer = await resolveSigner(clientDoc, input.contactEmail, scope);
  if (!signer?.email) {
    return { error: "Ingen e-mail til underskriver", status: 400 };
  }

  /** @type {RawDoc | null} */
  let template = null;
  if (contract.templateId) {
    template = /** @type {RawDoc | null} */ (
      await ContractTemplate.findById(contract.templateId).lean()
    );
  }
  if (!template) {
    template = await resolveDefaultContractTemplate(/** @type {RawDoc} */ (scope));
  }
  if (!template) return { error: "Ingen skabelon", status: 400 };

  await ContractSigningInvite.updateMany(
    {
      contractId: contract._id,
      status: { $in: ["pending", "unlocked"] },
    },
    { $set: { status: "revoked" } },
  );

  const documentBodyMd =
    typeof contract.documentBodyMd === "string" && contract.documentBodyMd.trim() ?
      contract.documentBodyMd
    : String(template.documentBodyMd ?? "");
  const documentHash = hashContractDocument(documentBodyMd);

  const token = generateContractSigningToken();
  const accessCode = generateContractAccessCode();
  const signingUrl = buildContractSigningUrl(token);
  const expiresAt = new Date(Date.now() + CONTRACT_SIGNING_INVITE_TTL_MS);

  const clientName = String(clientDoc.name ?? "Kunden");
  const label = String(contract.label ?? template.name ?? "Aftale");

  const emailVars = {
    clientName,
    signerName: signer.name,
    contractLabel: label,
    noticeDays: String(contract.noticeDays ?? 90),
    today: new Date().toISOString().slice(0, 10),
    signingUrl,
    accessCode,
  };

  const subject = renderContractTemplateText(String(template.subject ?? "Underskriv aftale"), emailVars);
  const textBody = renderContractTemplateText(String(template.emailBodyMd ?? ""), emailVars);

  const invite = await ContractSigningInvite.create({
    token,
    accessCodeHash: hashContractAccessCode(accessCode),
    contractId: contract._id,
    clientId: clientDoc._id,
    clientSlug: String(clientDoc.slug ?? clientDoc._id),
    templateId: template._id,
    signerEmail: signer.email,
    signerName: signer.name,
    status: "pending",
    expiresAt,
    documentBodyMd,
    documentHash,
    isTest: Boolean(contract.isTest),
  });

  try {
    const sent = await sendPostmarkEmail({
      to: signer.email,
      subject,
      textBody,
      kind: "contract",
      signingUrl,
      accessCode,
      tag: "contract-signing",
    });

    invite.postmarkMessageId = sent.messageId;
    await invite.save();

    contract.status = "pending_signature";
    contract.documentBodyMd = documentBodyMd;
    if (!contract.termsSummary) contract.termsSummary = documentBodyMd.slice(0, 280);
    await contract.save();

    return {
      ok: true,
      contractId: String(contract._id),
      contractKey: contract.key ? String(contract.key) : String(contract._id),
      inviteId: String(invite._id),
      signerEmail: signer.email,
      expiresAt: expiresAt.toISOString(),
      // Only returned for local/dev convenience — never log in production UIs long-term
      debugAccessCode: process.env.NODE_ENV === "development" ? accessCode : undefined,
    };
  } catch (err) {
    await ContractSigningInvite.deleteOne({ _id: invite._id });
    const message = err instanceof Error ? err.message : "Kunne ikke sende e-mail";
    return { error: message, status: 502 };
  }
}
