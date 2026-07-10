import NpsSettings from "@/lib/db/models/nps-settings";
import { connectDb } from "@/lib/db/mongoose";
import {
  computeNextSendOccurrences,
  DEFAULT_NPS_SEND_DATES,
  isValidSendTimeLocal,
  normalizeSendDates,
} from "@/lib/nps/settings-utils";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {boolean} includeTest
 */
function settingsQuery(includeTest) {
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(includeTest ? "test" : "production")
  );
  return andQuery(scope, { scopeKey: "default" });
}

/**
 * @param {Record<string, unknown>} doc
 */
function serializeNpsSettings(doc) {
  const sendDates = normalizeSendDates(doc.sendDates);
  const sendTimeLocal =
    typeof doc.sendTimeLocal === "string" && isValidSendTimeLocal(doc.sendTimeLocal) ?
      doc.sendTimeLocal
    : "09:00";

  return {
    autoSendEnabled: Boolean(doc.autoSendEnabled),
    sendTimeLocal,
    sendDates,
    nextOccurrences: computeNextSendOccurrences(sendDates, { limit: 8 }),
  };
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchNpsSettings(opts = {}) {
  await connectDb();
  const includeTest = Boolean(opts.includeTest);
  const query = settingsQuery(includeTest);

  let doc = await NpsSettings.findOne(/** @type {Record<string, unknown>} */ (query)).lean();

  if (!doc || typeof doc !== "object") {
    const scope = /** @type {Record<string, unknown>} */ (
      buildIsTestQuery(includeTest ? "test" : "production")
    );
    const created = await NpsSettings.create({
      scopeKey: "default",
      autoSendEnabled: false,
      sendTimeLocal: "09:00",
      sendDates: DEFAULT_NPS_SEND_DATES,
      ...(scope.isTest === true ? { isTest: true } : { isTest: false }),
    });
    doc = created.toObject();
  }

  return serializeNpsSettings(/** @type {Record<string, unknown>} */ (doc));
}

/**
 * @param {{
 *   includeTest?: boolean;
 *   autoSendEnabled?: boolean;
 *   sendTimeLocal?: string;
 *   sendDates?: unknown[];
 * }} patch
 */
export async function patchNpsSettings(patch) {
  await connectDb();
  const includeTest = Boolean(patch.includeTest);
  const query = settingsQuery(includeTest);
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(includeTest ? "test" : "production")
  );

  /** @type {Record<string, unknown>} */
  const $set = {};

  if (typeof patch.autoSendEnabled === "boolean") {
    $set.autoSendEnabled = patch.autoSendEnabled;
  }

  if (typeof patch.sendTimeLocal === "string") {
    const time = patch.sendTimeLocal.trim();
    if (!isValidSendTimeLocal(time)) {
      return { error: "Ugyldig sendetid — brug formatet HH:mm", status: 400 };
    }
    $set.sendTimeLocal = time;
  }

  if (Array.isArray(patch.sendDates)) {
    const normalized = normalizeSendDates(patch.sendDates);
    if (!normalized.length) {
      return { error: "Tilføj mindst én udsendelsesdato", status: 400 };
    }
    $set.sendDates = normalized;
  }

  if (!Object.keys($set).length) {
    return { error: "Ingen felter at opdatere", status: 400 };
  }

  const doc = await NpsSettings.findOneAndUpdate(
    /** @type {Record<string, unknown>} */ (query),
    {
      $set,
      $setOnInsert: {
        scopeKey: "default",
        ...(scope.isTest === true ? { isTest: true } : { isTest: false }),
      },
    },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  if (!doc || typeof doc !== "object") {
    return { error: "Kunne ikke gemme indstillinger", status: 500 };
  }

  return { settings: serializeNpsSettings(/** @type {Record<string, unknown>} */ (doc)) };
}

/**
 * @param {{
 *   autoSendEnabled: boolean;
 *   sendDates: { month: number; day: number }[];
 * }} settings
 */
export function buildScheduleWavesFromSettings(settings) {
  if (!settings.autoSendEnabled) return [];
  const occurrences = computeNextSendOccurrences(settings.sendDates, { limit: 6 });
  return occurrences.map((occ) => ({
    id: `auto-${occ.isoDate}`,
    clientId: "—",
    wave: "Automatisk bureau-udsendelse",
    plannedAt: occ.isoDate,
    templateId: "standard",
    status: "scheduled",
  }));
}
