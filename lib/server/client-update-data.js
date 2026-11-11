import mongoose from "mongoose";

import { GROUP_KEY_SOLO, normalizeCvr, normalizeGroupKey } from "@/lib/crm/client-groups";
import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import { buildContractRetainerSumByClientId } from "@/lib/crm/retainer-utils";
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
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim().slice(0, 10);
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** @param {unknown} raw */
function parseStringArray(raw) {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((v) => String(v).trim()).filter(Boolean);
}

/** @param {unknown} raw */
function parseStringMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, val] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const s = String(val ?? "").trim();
    if (s) out[key] = s;
  }
  return out;
}

/** @param {unknown} raw */
function parseNumberMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  /** @type {Record<string, number>} */
  const out = {};
  for (const [key, val] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const n = parseOptionalNumber(val);
    if (n != null && n > 0) out[key] = n;
  }
  return out;
}

/** @param {unknown} raw */
function parseContactEmbed(raw, isPrimary) {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return undefined;
  const c = /** @type {Record<string, unknown>} */ (raw);
  const name = String(c.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    title: String(c.title ?? "").trim() || undefined,
    email: String(c.email ?? "").trim().toLowerCase() || undefined,
    phone: String(c.phone ?? "").trim() || undefined,
    linkedinUrl: String(c.linkedinUrl ?? "").trim() || undefined,
    isPrimary,
  };
}

/**
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} patch
 * @param {{ by?: string }} [meta]
 */
export async function updateClientMongo(clientKey, includeTest, patch, meta = {}) {
  const key = clientKey.trim();
  if (!key) return { error: "Mangler kundenøgle", status: 400 };

  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");

  /** @type {Record<string, unknown>[]} */
  const slugOrId = [{ slug: key }];
  if (mongoose.Types.ObjectId.isValid(key)) {
    slugOrId.push({ _id: new mongoose.Types.ObjectId(key) });
  }

  const existingRaw = await Client.findOne(
    andQuery(/** @type {Record<string, unknown>} */ ({ $or: slugOrId }), /** @type {Record<string, unknown>} */ (scope)),
  ).lean();
  const existing = existingRaw != null ? /** @type {Record<string, unknown>} */ (existingRaw) : null;
  if (!existing) return { error: "Ikke fundet", status: 404 };

  /** @type {Record<string, unknown>} */
  const $set = {};
  /** @type {Record<string, 1>} */
  const $unset = {};

  if ("slug" in patch) {
    const slug = String(patch.slug ?? "").trim();
    if (!slug) return { error: "Slug kan ikke være tom", status: 400 };
    $set.slug = slug;
  }
  if ("name" in patch) {
    const name = String(patch.name ?? "").trim();
    if (!name) return { error: "Navn er påkrævet", status: 400 };
    $set.name = name;
  }
  if ("industry" in patch) $set.industry = patch.industry ? String(patch.industry).trim() : null;
  if ("logoInitials" in patch) {
    $set.logoInitials = patch.logoInitials ? String(patch.logoInitials).trim().slice(0, 4) : null;
  }
  if ("hue" in patch) {
    const hue = parseOptionalNumber(patch.hue);
    $set.hue = hue != null ? Math.round(hue) : null;
  }
  if ("cvr" in patch) {
    const rawCvr = patch.cvr ? String(patch.cvr).trim() : "";
    if (!rawCvr) {
      $set.cvr = null;
    } else {
      const normalized = normalizeCvr(rawCvr);
      if (normalized) {
        $set.cvr = normalized;
      } else if (rawCvr !== String(existing.cvr ?? "").trim()) {
        // Kun ændringer valideres — gamle (ugyldige) værdier må stadig gemmes uændret.
        return { error: "CVR skal være 8 cifre (og ikke ens cifre)", status: 400 };
      } else {
        $set.cvr = rawCvr;
      }
    }
  }
  if ("groupKey" in patch) {
    // "" / null = afled kundegruppe af CVR; "-" = bevidst selvstændig; ellers gyldig kundegruppe-nøgle.
    const rawKey = patch.groupKey ? String(patch.groupKey).trim() : "";
    if (!rawKey) {
      $set.groupKey = null;
    } else if (rawKey === GROUP_KEY_SOLO) {
      $set.groupKey = GROUP_KEY_SOLO;
    } else {
      const key = normalizeGroupKey(rawKey);
      if (!key) return { error: "Ugyldig kundegruppe-nøgle", status: 400 };
      $set.groupKey = key;
    }
  }
  if ("status" in patch) {
    const status = String(patch.status ?? "");
    if (!["active", "paused", "inactive"].includes(status)) {
      return { error: "Ugyldig status", status: 400 };
    }
    $set.status = status;
  }
  if ("health" in patch) {
    const health = String(patch.health ?? "");
    if (!["ok", "warn", "bad"].includes(health)) {
      return { error: "Ugyldig sundhed", status: 400 };
    }
    $set.health = health;
  }
  if ("ownerMemberKey" in patch) {
    const ownerKey = patch.ownerMemberKey ? String(patch.ownerMemberKey).trim() : "";
    if (!ownerKey) {
      $set.ownerMemberKey = null;
      $set.ownerId = null;
    } else {
      const member = await TeamMember.findOne(
        andQuery({ key: ownerKey }, /** @type {Record<string, unknown>} */ (scope)),
      )
        .select("_id")
        .lean();
      if (!member?._id) return { error: `Ukendt account owner: ${ownerKey}`, status: 400 };
      $set.ownerMemberKey = ownerKey;
      $set.ownerId = member._id;
    }
  }
  if ("lastActivityLabel" in patch) {
    $set.lastActivityLabel = patch.lastActivityLabel ? String(patch.lastActivityLabel).trim() : null;
  }
  if ("retainerAmount" in patch) $set.retainerAmount = parseOptionalNumber(patch.retainerAmount) ?? null;
  if ("oneOffWebAmount" in patch) {
    $set.oneOffWebAmount = parseOptionalNumber(patch.oneOffWebAmount) ?? null;
  }
  if ("serviceAgreementAnnual" in patch) {
    $set.serviceAgreementAnnual = parseOptionalNumber(patch.serviceAgreementAnnual) ?? null;
  }
  if ("serviceBudgets" in patch) {
    const budgets = parseNumberMap(patch.serviceBudgets) ?? {};
    const total = Object.values(budgets).reduce((s, v) => s + v, 0);
    const baseRetainer =
      "retainerAmount" in patch ?
        (parseOptionalNumber(patch.retainerAmount) ?? 0)
      : typeof existing.retainerAmount === "number" ? existing.retainerAmount : 0;
    const contractDocs = await Contract.find({ clientId: existing._id })
      .select("clientId value status type signedAt")
      .lean();
    const contractSum =
      buildContractRetainerSumByClientId(/** @type {Record<string, unknown>[]} */ (contractDocs))[
        String(existing._id)
      ] ?? 0;
    const cap = baseRetainer + contractSum;
    if (total > cap + 0.5) {
      return {
        error: `Servicebudgetter (${Math.round(total).toLocaleString("da-DK")} kr) overstiger den samlede MRR (${Math.round(cap).toLocaleString("da-DK")} kr)`,
        status: 400,
      };
    }
    if (Object.keys(budgets).length) $set.serviceBudgets = budgets;
    else $unset.serviceBudgets = 1;
  }
  if ("currency" in patch) $set.currency = String(patch.currency ?? "DKK").trim() || "DKK";
  if ("marketingStartMrr" in patch) {
    $set.marketingStartMrr = parseOptionalNumber(patch.marketingStartMrr) ?? null;
  }
  if ("marketingUpsellMrr" in patch) {
    $set.marketingUpsellMrr = parseOptionalNumber(patch.marketingUpsellMrr) ?? null;
  }
  if ("agreementType" in patch) {
    $set.agreementType = patch.agreementType ? String(patch.agreementType).trim() : null;
  }
  if ("annualAdjustmentPct" in patch) {
    $set.annualAdjustmentPct = parseOptionalNumber(patch.annualAdjustmentPct) ?? null;
  }
  if ("startedAt" in patch) $set.startedAt = parseOptionalDate(patch.startedAt);
  if ("renewalAt" in patch) $set.renewalAt = parseOptionalDate(patch.renewalAt);
  if ("terminatedAt" in patch) $set.terminatedAt = parseOptionalDate(patch.terminatedAt);
  if ("lastContactedAt" in patch) $set.lastContactedAt = parseOptionalDate(patch.lastContactedAt);
  if ("leadSource" in patch) $set.leadSource = patch.leadSource ? String(patch.leadSource).trim() : null;
  if ("googleDriveUrl" in patch) {
    $set.googleDriveUrl = patch.googleDriveUrl ? String(patch.googleDriveUrl).trim() : null;
  }
  if ("customerClickUpId" in patch) {
    $set.customerClickUpId = patch.customerClickUpId ? String(patch.customerClickUpId).trim() : null;
  }
  if ("clickUpTaskName" in patch) {
    $set.clickUpTaskName = patch.clickUpTaskName ? String(patch.clickUpTaskName).trim() : null;
  }
  if ("churnNote" in patch) $set.churnNote = patch.churnNote ? String(patch.churnNote).trim() : null;
  if ("infoMd" in patch) {
    $set.infoMd =
      patch.infoMd && String(patch.infoMd).trim() ? String(patch.infoMd).trim() : null;
  }
  if ("churnReason" in patch) $set.churnReason = parseStringArray(patch.churnReason) ?? [];
  if ("tags" in patch) $set.tags = parseStringArray(patch.tags) ?? [];
  if ("servicesActive" in patch) $set.servicesActive = parseStringArray(patch.servicesActive) ?? [];
  if ("hoursBudget" in patch) $set.hoursBudget = parseOptionalNumber(patch.hoursBudget) ?? null;
  if ("monthlyProfitMargin" in patch) {
    $set.monthlyProfitMargin = parseOptionalNumber(patch.monthlyProfitMargin) ?? null;
  }
  if ("npsInterval" in patch) {
    const interval = String(patch.npsInterval ?? "");
    if (interval && !["monthly", "quarterly", "biannual"].includes(interval)) {
      return { error: "Ugyldig NPS-cyklus", status: 400 };
    }
    $set.npsInterval = interval || null;
  }
  if ("allocation" in patch) {
    const alloc = parseNumberMap(patch.allocation);
    if (alloc && Object.keys(alloc).length) $set.allocation = alloc;
    else $unset.allocation = 1;
  }
  if ("deptAssignees" in patch) {
    const da = parseStringMap(patch.deptAssignees);
    if (da && Object.keys(da).length) $set.deptAssignees = da;
    else $unset.deptAssignees = 1;
  }
  if ("primaryContact" in patch) {
    const contact = parseContactEmbed(patch.primaryContact, true);
    if (contact === null) $unset.primaryContact = 1;
    else if (contact) $set.primaryContact = contact;
  }
  if ("secondaryContact" in patch) {
    const contact = parseContactEmbed(patch.secondaryContact, false);
    if (contact === null) $unset.secondaryContact = 1;
    else if (contact) $set.secondaryContact = contact;
  }

  if (!Object.keys($set).length && !Object.keys($unset).length) {
    return { error: "Ingen felter opdateret", status: 400 };
  }

  /** @type {Record<string, unknown>} */
  const updateDoc = {};
  if (Object.keys($set).length) updateDoc.$set = $set;
  if (Object.keys($unset).length) updateDoc.$unset = $unset;

  // Log ændringer i aftalebeløb (opsalg m.m.), så historikken kan ses på kunden.
  /** @type {Record<string, { from: number | null; to: number | null }>} */
  const changes = {};
  for (const field of ["retainerAmount", "oneOffWebAmount", "serviceAgreementAnnual"]) {
    if (!(field in $set)) continue;
    const from = typeof existing[field] === "number" ? /** @type {number} */ (existing[field]) : null;
    const to = typeof $set[field] === "number" ? /** @type {number} */ ($set[field]) : null;
    if (from !== to) changes[field] = { from, to };
  }
  if (Object.keys(changes).length) {
    updateDoc.$push = {
      commercialLog: {
        $each: [
          {
            at: new Date(),
            by: meta.by ?? "",
            note: patch.commercialNote ? String(patch.commercialNote).trim().slice(0, 500) : "",
            changes,
          },
        ],
        $slice: -50,
      },
    };
  }

  try {
    await Client.updateOne({ _id: existing._id }, updateDoc).exec();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate key")) {
      return { error: "Slug eller ClickUp-id findes allerede", status: 409 };
    }
    throw e;
  }

  const fresh = await Client.findById(existing._id).lean();
  return {
    ok: /** @type {const} */ (true),
    slug: fresh ? String(fresh.slug ?? key) : key,
  };
}
