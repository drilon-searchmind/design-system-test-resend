import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @param {unknown} raw */
function parseOptionalNumber(raw) {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** @param {unknown} raw */
function parseOptionalDate(raw) {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const s = String(raw).trim().slice(0, 10);
  if (!s) return undefined;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** @param {unknown} raw */
function parseContactEmbed(raw, isPrimary) {
  if (!raw || typeof raw !== "object") return undefined;
  const c = /** @type {Record<string, unknown>} */ (raw);
  const name = String(c.name ?? "").trim();
  if (!name) return undefined;
  return {
    name,
    title: String(c.title ?? "").trim() || undefined,
    email: String(c.email ?? "").trim().toLowerCase() || undefined,
    phone: String(c.phone ?? "").trim() || undefined,
    isPrimary,
  };
}

/** @param {string} name */
function initialsFromName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} body
 */
export async function createClientMongo(includeTest, body) {
  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!slug) return { error: "Slug er påkrævet", status: 400 };
  if (!name) return { error: "Navn er påkrævet", status: 400 };

  const status = String(body.status ?? "active");
  if (!["active", "paused", "inactive"].includes(status)) {
    return { error: "Ugyldig status", status: 400 };
  }

  const health = String(body.health ?? "ok");
  if (!["ok", "warn", "bad"].includes(health)) {
    return { error: "Ugyldig sundhed", status: 400 };
  }

  const npsIntervalRaw = body.npsInterval != null ? String(body.npsInterval).trim() : "";
  if (npsIntervalRaw && !["monthly", "quarterly", "biannual"].includes(npsIntervalRaw)) {
    return { error: "Ugyldig NPS-cyklus", status: 400 };
  }

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery(includeTest ? "all" : "production"));

  const slugTaken = await Client.findOne(/** @type {Record<string, unknown>} */ (andQuery(scope, { slug })))
    .select("_id")
    .lean();
  if (slugTaken) return { error: "Slug findes allerede", status: 409 };

  let ownerMemberKey = body.ownerMemberKey ? String(body.ownerMemberKey).trim() : "";
  let ownerId;
  if (ownerMemberKey) {
    const member = await TeamMember.findOne(/** @type {Record<string, unknown>} */ (andQuery(scope, { key: ownerMemberKey })))
      .select("_id")
      .lean();
    if (!member?._id) return { error: `Ukendt account owner: ${ownerMemberKey}`, status: 400 };
    ownerId = member._id;
  }

  const primaryContact = parseContactEmbed(body.primaryContact, true);
  const logoInitials =
    body.logoInitials ? String(body.logoInitials).trim().slice(0, 4).toUpperCase() : initialsFromName(name);
  const hueRaw = parseOptionalNumber(body.hue);
  const hue = hueRaw != null ? Math.min(360, Math.max(0, Math.round(hueRaw))) : 220;

  /** @type {Record<string, unknown>} */
  const doc = {
    slug,
    name,
    industry: body.industry ? String(body.industry).trim() : undefined,
    logoInitials: logoInitials || undefined,
    hue,
    currency: String(body.currency ?? "DKK").trim() || "DKK",
    retainerAmount: parseOptionalNumber(body.retainerAmount),
    startedAt: parseOptionalDate(body.startedAt),
    status,
    health,
    npsInterval: npsIntervalRaw || "quarterly",
    cvr: body.cvr ? String(body.cvr).trim() : undefined,
    leadSource: body.leadSource ? String(body.leadSource).trim() : undefined,
    hoursBudget: parseOptionalNumber(body.hoursBudget),
    ...(ownerMemberKey ? { ownerMemberKey, ownerId } : {}),
    ...(primaryContact ? { primaryContact } : {}),
    ...(scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {}),
  };

  try {
    const client = await Client.create(doc);

    if (primaryContact?.name) {
      await Contact.create({
        clientId: client._id,
        name: primaryContact.name,
        title: primaryContact.title,
        email: primaryContact.email,
        phone: primaryContact.phone,
        isPrimary: true,
        ...(scope.isTest === true ? { isTest: true } : scope.isTest === false ? { isTest: false } : {}),
      });
    }

    return {
      ok: /** @type {const} */ (true),
      slug: String(client.slug),
      id: String(client._id),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate key")) {
      return { error: "Slug eller ClickUp-id findes allerede", status: 409 };
    }
    return { error: msg, status: 400 };
  }
}
