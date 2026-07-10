import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import NpsInvite from "@/lib/db/models/nps-invite";
import NpsResponse from "@/lib/db/models/nps-response";
import { connectDb } from "@/lib/db/mongoose";
import { isValidNpsSurveyToken } from "@/lib/nps/survey-token";

/** @typedef {'pending' | 'answered' | 'expired' | 'invalid'} NpsSurveyStatus */

/**
 * @param {string} token
 */
export async function fetchNpsSurveyByToken(token) {
  if (!isValidNpsSurveyToken(token)) {
    return { status: /** @type {const} */ ("invalid") };
  }

  await connectDb();

  const invite = await NpsInvite.findOne({ token: token.trim() }).lean();
  if (!invite || typeof invite !== "object") {
    return { status: /** @type {const} */ ("invalid") };
  }

  const respondedAt = invite.respondedAt ? new Date(String(invite.respondedAt)) : null;
  if (respondedAt && !Number.isNaN(respondedAt.getTime())) {
    const response =
      invite.responseId != null ?
        await NpsResponse.findById(invite.responseId).select("score comment respondedAt").lean()
      : null;

    return {
      status: /** @type {const} */ ("answered"),
      firstName: firstNameFromContactName(String(invite.contactName ?? "")),
      clientName: await clientDisplayName(invite.clientId, String(invite.clientSlug ?? "")),
      answeredAt: respondedAt.toISOString(),
      score: response && typeof response.score === "number" ? response.score : null,
    };
  }

  const expiresAt = invite.expiresAt ? new Date(String(invite.expiresAt)) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { status: /** @type {const} */ ("expired") };
  }

  return {
    status: /** @type {const} */ ("pending"),
    firstName: firstNameFromContactName(String(invite.contactName ?? "")),
    clientName: await clientDisplayName(invite.clientId, String(invite.clientSlug ?? "")),
  };
}

/**
 * @param {string} token
 * @param {{ score: number; comment?: string }} input
 */
export async function submitNpsSurveyResponse(token, input) {
  if (!isValidNpsSurveyToken(token)) {
    return { error: "Ugyldigt link", status: 404 };
  }

  const score = Number(input.score);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return { error: "Vælg en score mellem 1 og 10", status: 400 };
  }

  const commentRaw = typeof input.comment === "string" ? input.comment.trim() : "";
  const comment = commentRaw.slice(0, 2000) || undefined;

  await connectDb();
  const trimmedToken = token.trim();

  const invite = await NpsInvite.findOne({ token: trimmedToken });
  if (!invite) return { error: "Ugyldigt link", status: 404 };

  if (invite.respondedAt) {
    return { ok: true, alreadyAnswered: true, status: /** @type {const} */ ("answered") };
  }

  const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { error: "Linket er udløbet", status: 410 };
  }

  const respondedAt = new Date();
  const sentAt = invite.sentAt ? new Date(invite.sentAt) : respondedAt;

  const response = await NpsResponse.create({
    clientId: invite.clientId,
    clientSlug: invite.clientSlug,
    contactEmail: invite.contactEmail,
    score,
    sentAt,
    respondedAt,
    templateId: invite.templateId ?? undefined,
    npsInviteId: invite._id,
    sendLogId: invite.sendLogId ?? undefined,
    comment,
  });

  const locked = await NpsInvite.findOneAndUpdate(
    {
      _id: invite._id,
      $or: [{ respondedAt: null }, { respondedAt: { $exists: false } }],
    },
    { $set: { respondedAt, responseId: response._id } },
    { new: true },
  );

  if (!locked) {
    await NpsResponse.deleteOne({ _id: response._id });
    return { ok: true, alreadyAnswered: true, status: /** @type {const} */ ("answered") };
  }

  return {
    ok: true,
    status: /** @type {const} */ ("answered"),
    score,
  };
}

/** @param {string} name */
function firstNameFromContactName(name) {
  const n = String(name ?? "").trim();
  if (!n) return "der";
  return n.split(/\s+/)[0] ?? "der";
}

/**
 * @param {unknown} clientId
 * @param {string} fallbackSlug
 */
async function clientDisplayName(clientId, fallbackSlug) {
  if (clientId != null && mongoose.Types.ObjectId.isValid(String(clientId))) {
    const client = await Client.findById(clientId).select("name").lean();
    if (client && typeof client.name === "string" && client.name.trim()) {
      return client.name.trim();
    }
  }
  return fallbackSlug || "Searchmind";
}
