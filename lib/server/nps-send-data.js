import mongoose from "mongoose";

import { renderNpsTemplateText } from "@/lib/email/nps-template-render";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { resolveNpsRecipient } from "@/lib/crm/nps-recipient";
import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import NpsInvite from "@/lib/db/models/nps-invite";
import NpsSendLog from "@/lib/db/models/nps-send-log";
import NpsTemplate from "@/lib/db/models/nps-template";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import { buildNpsSurveyUrl, generateNpsSurveyToken, NPS_INVITE_TTL_MS } from "@/lib/nps/survey-token";
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
 * @param {RawDoc} scope
 */
async function resolveDefaultTemplate(scope) {
  const def = await NpsTemplate.findOne(/** @type {RawDoc} */ (andQuery(scope, { active: true, isDefault: true })))
    .lean();
  if (def && typeof def === "object") return /** @type {RawDoc} */ (def);

  const fallback = await NpsTemplate.findOne(/** @type {RawDoc} */ (andQuery(scope, { active: true, key: "default" })))
    .lean();
  if (fallback && typeof fallback === "object") return /** @type {RawDoc} */ (fallback);

  const any = await NpsTemplate.findOne(/** @type {RawDoc} */ (andQuery(scope, { active: true })))
    .sort({ name: 1 })
    .lean();
  return any && typeof any === "object" ? /** @type {RawDoc} */ (any) : null;
}

/**
 * @param {RawDoc} clientDoc
 * @param {RawDoc} scope
 */
async function resolveTemplateForClient(clientDoc, scope) {
  const tid = clientDoc.npsTemplateId;
  if (tid != null && mongoose.Types.ObjectId.isValid(String(tid))) {
    const custom = await NpsTemplate.findOne(
      /** @type {RawDoc} */ (andQuery(scope, { _id: tid, active: true })),
    ).lean();
    if (custom && typeof custom === "object") return /** @type {RawDoc} */ (custom);
  }
  return resolveDefaultTemplate(scope);
}

/**
 * @param {RawDoc} clientDoc
 * @param {RawDoc} scope
 */
async function loadNpsContactsForClient(clientDoc, scope) {
  const oid = clientDoc._id;
  if (oid == null) return [];
  const docs = await Contact.find(
    /** @type {RawDoc} */ (andQuery(scope, { clientId: oid })),
  )
    .sort({ isPrimary: -1, name: 1 })
    .lean();
  return (Array.isArray(docs) ? docs : []).map((row) => {
    const r = /** @type {RawDoc} */ (row);
    return {
      id: r._id != null ? String(r._id) : "",
      name: String(r.name ?? ""),
      email: typeof r.email === "string" ? r.email.trim() : "",
      title: typeof r.title === "string" ? r.title : "",
      isPrimary: Boolean(r.isPrimary),
    };
  });
}

/**
 * @param {RawDoc} clientDoc
 * @param {RawDoc} scope
 */
async function resolveRecipientForSend(clientDoc, scope) {
  const contacts = await loadNpsContactsForClient(clientDoc, scope);
  const customRaw = clientDoc.npsRecipientCustom;
  const custom =
    customRaw && typeof customRaw === "object" ?
      {
        name: typeof customRaw.name === "string" ? customRaw.name : "",
        email: typeof customRaw.email === "string" ? customRaw.email : "",
      }
    : null;

  return resolveNpsRecipient({
    primaryContact:
      clientDoc.primaryContact && typeof clientDoc.primaryContact === "object" ?
        /** @type {{ name?: string; email?: string }} */ (clientDoc.primaryContact)
      : undefined,
    secondaryContact:
      clientDoc.secondaryContact && typeof clientDoc.secondaryContact === "object" ?
        /** @type {{ name?: string; email?: string }} */ (clientDoc.secondaryContact)
      : undefined,
    npsContacts: contacts,
    npsRecipientKind:
      typeof clientDoc.npsRecipientKind === "string" ?
        /** @type {'primary' | 'secondary' | 'contact' | 'custom'} */ (clientDoc.npsRecipientKind)
      : "primary",
    npsRecipientContactId:
      clientDoc.npsRecipientContactId != null ? String(clientDoc.npsRecipientContactId) : null,
    npsRecipientCustom: custom,
  });
}

/**
 * @param {string | undefined} ownerMemberKey
 * @param {RawDoc} scope
 */
async function ownerDisplayName(ownerMemberKey, scope) {
  const mk = typeof ownerMemberKey === "string" ? ownerMemberKey.trim() : "";
  if (!mk) return "Searchmind";
  const m = await TeamMember.findOne(/** @type {RawDoc} */ (andQuery(scope, { key: mk })))
    .select("name")
    .lean();
  return m && typeof m === "object" && typeof m.name === "string" ? m.name : "Searchmind";
}

/**
 * @param {{
 *   clientSlug: string;
 *   templateKey?: string;
 *   contactEmail?: string;
 *   includeTest?: boolean;
 *   session?: { user?: { id?: string } };
 * }} opts
 */
export async function sendNpsEmailToClient(opts) {
  await connectDb();
  const slug = String(opts.clientSlug ?? "").trim();
  if (!slug) return { error: "Mangler kunde-slug", status: 400 };

  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));
  const clientRaw = await Client.findOne(/** @type {RawDoc} */ (andQuery(scope, { slug }))).lean();
  if (!clientRaw || typeof clientRaw !== "object") {
    return { error: "Kunde ikke fundet", status: 404 };
  }
  const clientDoc = /** @type {RawDoc} */ (clientRaw);

  let templateDoc = null;
  if (opts.templateKey) {
    templateDoc = await NpsTemplate.findOne(
      /** @type {RawDoc} */ (andQuery(scope, { key: String(opts.templateKey).trim(), active: true })),
    ).lean();
    if (!templateDoc) return { error: "Skabelon ikke fundet", status: 404 };
  } else {
    templateDoc = await resolveTemplateForClient(clientDoc, scope);
  }
  if (!templateDoc) return { error: "Ingen aktiv NPS-skabelon", status: 400 };

  if (clientDoc.npsSendEnabled === false) {
    return { error: "NPS-udsendelse er deaktiveret for denne kunde", status: 400 };
  }

  const resolved = await resolveRecipientForSend(clientDoc, scope);
  const toEmail =
    typeof opts.contactEmail === "string" && opts.contactEmail.trim() ?
      opts.contactEmail.trim()
    : resolved?.email ?? "";
  if (!toEmail) return { error: "Ingen NPS-modtager-e-mail valgt", status: 400 };

  const firstName = resolved?.name?.split(/\s+/)[0] ?? "der";
  const accountManager = await ownerDisplayName(
    typeof clientDoc.ownerMemberKey === "string" ? clientDoc.ownerMemberKey : "",
    scope,
  );
  const clientName = typeof clientDoc.name === "string" ? clientDoc.name : slug;

  const subject = renderNpsTemplateText(String(templateDoc.subject ?? ""), {
    firstName,
    accountManager,
    clientName,
  });
  const body = renderNpsTemplateText(String(templateDoc.bodyMd ?? ""), {
    firstName,
    accountManager,
    clientName,
  });

  const surveyToken = generateNpsSurveyToken();
  const surveyUrl = buildNpsSurveyUrl(surveyToken);
  const expiresAt = new Date(Date.now() + NPS_INVITE_TTL_MS);

  const sentByUserId =
    opts.session?.user?.id && mongoose.Types.ObjectId.isValid(String(opts.session.user.id)) ?
      new mongoose.Types.ObjectId(String(opts.session.user.id))
    : undefined;

  /** @type {RawDoc} */
  const logBase = {
    clientId: clientDoc._id,
    clientSlug: slug,
    contactEmail: toEmail,
    contactName: resolved?.name ?? "",
    templateId: templateDoc._id,
    templateKey: typeof templateDoc.key === "string" ? templateDoc.key : "",
    subject,
    sentByUserId,
    bodyPreview: body.slice(0, 280),
    ...(scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {}),
  };

  try {
    const invite = await NpsInvite.create({
      token: surveyToken,
      clientId: clientDoc._id,
      clientSlug: slug,
      contactEmail: toEmail,
      contactName: resolved?.name ?? "",
      templateId: templateDoc._id,
      sentAt: new Date(),
      expiresAt,
      ...(scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {}),
    });

    const result = await sendPostmarkEmail({
      to: toEmail,
      subject,
      textBody: body,
      surveyUrl,
      tag: "nps-survey",
    });

    const log = await NpsSendLog.create({
      ...logBase,
      status: "sent",
      postmarkMessageId: result.messageId,
      sentAt: new Date(),
    });

    await NpsInvite.updateOne({ _id: invite._id }, { $set: { sendLogId: log._id } });

    return {
      ok: true,
      sendLogId: String(log._id),
      messageId: result.messageId,
      contactEmail: toEmail,
      templateKey: logBase.templateKey,
      surveyUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke sende e-mail";
    await NpsInvite.deleteOne({ token: surveyToken }).catch(() => {});
    await NpsSendLog.create({
      ...logBase,
      status: "failed",
      postmarkError: message,
      sentAt: new Date(),
    });
    return { error: message, status: 502 };
  }
}

/**
 * @param {{ includeTest?: boolean; limit?: number }} [opts]
 */
export async function fetchNpsSendLogSummary(opts = {}) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production"));
  const limit = typeof opts.limit === "number" && opts.limit > 0 ? Math.min(opts.limit, 50) : 20;

  const match = andQuery(scope);
  const [totalSent, totalFailed, recentRaw] = await Promise.all([
    NpsSendLog.countDocuments(/** @type {RawDoc} */ (andQuery(scope, { status: "sent" }))),
    NpsSendLog.countDocuments(/** @type {RawDoc} */ (andQuery(scope, { status: "failed" }))),
    NpsSendLog.find(/** @type {RawDoc} */ (match))
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const recent = (Array.isArray(recentRaw) ? recentRaw : []).map((row) => {
    const r = /** @type {RawDoc} */ (row);
    return {
      id: r._id != null ? String(r._id) : "",
      clientSlug: String(r.clientSlug ?? ""),
      contactEmail: String(r.contactEmail ?? ""),
      templateKey: String(r.templateKey ?? ""),
      status: String(r.status ?? ""),
      sentAt: r.sentAt ? new Date(String(r.sentAt)).toISOString() : "",
      subject: String(r.subject ?? ""),
    };
  });

  return { totalSent, totalFailed, recent };
}

/**
 * @param {{
 *   key: string;
 *   name: string;
 *   subject: string;
 *   bodyMd: string;
 *   isDefault?: boolean;
 *   includeTest?: boolean;
 * }} input
 */
export async function createNpsTemplate(input) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(input.includeTest) ? "all" : "production"));
  const key = String(input.key ?? "").trim();
  if (!key) return { error: "Nøgle påkrævet", status: 400 };

  const exists = await NpsTemplate.findOne(/** @type {RawDoc} */ (andQuery(scope, { key }))).lean();
  if (exists) return { error: "Skabelon med denne nøgle findes allerede", status: 409 };

  if (input.isDefault) {
    await NpsTemplate.updateMany(/** @type {RawDoc} */ (scope), { $set: { isDefault: false } });
  }

  const doc = await NpsTemplate.create({
    key,
    name: String(input.name ?? key),
    subject: String(input.subject ?? ""),
    bodyMd: String(input.bodyMd ?? ""),
    locale: "da",
    active: true,
    isDefault: Boolean(input.isDefault),
    ...(scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {}),
  });

  return {
    ok: true,
    template: {
      id: key,
      key,
      name: doc.name,
      subject: doc.subject,
      body: doc.bodyMd,
      isDefault: doc.isDefault,
    },
  };
}

/**
 * @param {string} templateKey
 * @param {{ isDefault?: boolean; name?: string; subject?: string; bodyMd?: string; includeTest?: boolean }} patch
 */
export async function patchNpsTemplate(templateKey, patch) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(patch.includeTest) ? "all" : "production"));
  const key = String(templateKey ?? "").trim();
  if (!key) return { error: "Mangler skabelon-nøgle", status: 400 };

  const doc = await NpsTemplate.findOne(/** @type {RawDoc} */ (andQuery(scope, { key })));
  if (!doc) return { error: "Skabelon ikke fundet", status: 404 };

  if (patch.isDefault === true) {
    await NpsTemplate.updateMany(/** @type {RawDoc} */ (scope), { $set: { isDefault: false } });
    doc.isDefault = true;
  }
  if (typeof patch.name === "string") doc.name = patch.name;
  if (typeof patch.subject === "string") doc.subject = patch.subject;
  if (typeof patch.bodyMd === "string") doc.bodyMd = patch.bodyMd;
  await doc.save();

  return {
    ok: true,
    template: {
      id: key,
      key,
      name: doc.name,
      subject: doc.subject,
      body: doc.bodyMd,
      isDefault: Boolean(doc.isDefault),
    },
  };
}

/**
 * @param {string} clientSlug
 * @param {{ templateKey: string | null; includeTest?: boolean }} patch
 */
export async function assignClientNpsTemplate(clientSlug, patch) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(patch.includeTest) ? "all" : "production"));
  const slug = String(clientSlug ?? "").trim();
  if (!slug) return { error: "Mangler kunde-slug", status: 400 };

  const client = await Client.findOne(/** @type {RawDoc} */ (andQuery(scope, { slug })));
  if (!client) return { error: "Kunde ikke fundet", status: 404 };

  if (patch.templateKey == null || patch.templateKey === "") {
    client.npsTemplateId = undefined;
  } else {
    const tmpl = await NpsTemplate.findOne(
      /** @type {RawDoc} */ (andQuery(scope, { key: String(patch.templateKey).trim(), active: true })),
    ).lean();
    if (!tmpl || typeof tmpl !== "object") return { error: "Skabelon ikke fundet", status: 404 };
    client.npsTemplateId = tmpl._id;
  }

  await client.save();
  return {
    ok: true,
    clientSlug: slug,
    templateKey: patch.templateKey ?? null,
  };
}

/**
 * @param {string} clientSlug
 * @param {{
 *   npsSendEnabled?: boolean;
 *   npsRecipientKind?: 'primary' | 'secondary' | 'contact' | 'custom';
 *   npsRecipientContactId?: string | null;
 *   npsRecipientCustom?: { name?: string; email?: string } | null;
 *   includeTest?: boolean;
 * }} patch
 */
export async function patchClientNpsSettings(clientSlug, patch) {
  await connectDb();
  const scope = /** @type {RawDoc} */ (buildIsTestQuery(Boolean(patch.includeTest) ? "all" : "production"));
  const slug = String(clientSlug ?? "").trim();
  if (!slug) return { error: "Mangler kunde-slug", status: 400 };

  const client = await Client.findOne(/** @type {RawDoc} */ (andQuery(scope, { slug })));
  if (!client) return { error: "Kunde ikke fundet", status: 404 };

  if (typeof patch.npsSendEnabled === "boolean") {
    client.npsSendEnabled = patch.npsSendEnabled;
  }

  if (patch.npsRecipientKind) {
    const kind = String(patch.npsRecipientKind);
    if (!["primary", "secondary", "contact", "custom"].includes(kind)) {
      return { error: "Ugyldig modtager-type", status: 400 };
    }
    client.npsRecipientKind = kind;

    if (kind === "contact") {
      const cid = patch.npsRecipientContactId ? String(patch.npsRecipientContactId).trim() : "";
      if (!cid || !mongoose.Types.ObjectId.isValid(cid)) {
        return { error: "Vælg en kontakt", status: 400 };
      }
      const contact = await Contact.findOne(
        /** @type {RawDoc} */ (andQuery(scope, { _id: new mongoose.Types.ObjectId(cid), clientId: client._id })),
      ).lean();
      if (!contact) return { error: "Kontakt ikke fundet på kunden", status: 404 };
      client.npsRecipientContactId = new mongoose.Types.ObjectId(cid);
      client.npsRecipientCustom = undefined;
    } else if (kind === "custom") {
      const custom = patch.npsRecipientCustom;
      const email = typeof custom?.email === "string" ? custom.email.trim().toLowerCase() : "";
      client.npsRecipientCustom = {
        name: typeof custom?.name === "string" ? custom.name.trim() : "",
        email,
      };
      client.npsRecipientContactId = undefined;
    } else {
      client.npsRecipientContactId = undefined;
      client.npsRecipientCustom = undefined;
    }
  }

  await client.save();

  return {
    ok: true,
    clientSlug: slug,
    npsSendEnabled: client.npsSendEnabled !== false,
    npsRecipientKind: client.npsRecipientKind ?? "primary",
  };
}
