import Client from "@/lib/db/models/client";
import NpsSendLog from "@/lib/db/models/nps-send-log";
import { connectDb } from "@/lib/db/mongoose";
import { addCalendarMonths, npsCadenceMonths, npsClientAgeStatus } from "@/lib/crm/nps-cadence";
import {
  getCopenhagenParts,
  isPastSendTimeLocal,
  isScheduledSendDay,
} from "@/lib/nps/settings-utils";
import { sendNpsEmailToClient } from "@/lib/server/nps-send-data";
import { fetchNpsSettings } from "@/lib/server/nps-settings-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {Date} now
 */
function startOfCopenhagenDayUtcWindow(now) {
  const parts = getCopenhagenParts(now);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

const SKIP_SENT_TODAY = "already_sent_today";
const SKIP_WITHIN_CYCLE = "within_nps_cycle";
const SKIP_TOO_NEW = "client_too_new";

/**
 * Automatisk NPS-udsendelse på planlagte datoer (cron).
 * Springer kunder over der er yngre end 1 måned, eller som har fået NPS inden for deres cyklus
 * (`npsInterval`, aldrig kortere end det rullende 2-måneders vindue).
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function processNpsScheduledSends(opts = {}) {
  await connectDb();
  const includeTest = Boolean(opts.includeTest);
  const settings = await fetchNpsSettings({ includeTest });
  if (!settings.autoSendEnabled) {
    return { skipped: true, reason: "auto_send_disabled" };
  }

  const now = new Date();
  if (!isScheduledSendDay(now, settings.sendDates)) {
    return { skipped: true, reason: "not_scheduled_day" };
  }
  if (!isPastSendTimeLocal(now, settings.sendTimeLocal)) {
    return { skipped: true, reason: "before_send_time" };
  }

  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));
  const dayStart = startOfCopenhagenDayUtcWindow(now);

  const clients = await Client.find(
    /** @type {Record<string, unknown>} */ (
      andQuery(scope, { status: { $in: ["active", "paused"] }, npsSendEnabled: { $ne: false } })
    ),
  )
    .select({ slug: 1, startedAt: 1, createdAt: 1, npsInterval: 1 })
    .lean();

  const list = Array.isArray(clients) ? clients : [];
  const slugs = list
    .map((row) => (typeof row.slug === "string" ? row.slug.trim() : ""))
    .filter(Boolean);

  /** Seneste vellykkede udsendelse pr. kunde — ét opslag for hele kørslen. */
  const lastSentRows =
    slugs.length ?
      await NpsSendLog.aggregate([
        { $match: andQuery(scope, { clientSlug: { $in: slugs }, status: "sent" }) },
        { $group: { _id: "$clientSlug", lastSentAt: { $max: "$sentAt" } } },
      ])
    : [];
  /** @type {Map<string, Date>} */
  const lastSentBySlug = new Map();
  for (const r of lastSentRows) {
    const at = r.lastSentAt instanceof Date ? r.lastSentAt : new Date(String(r.lastSentAt));
    if (typeof r._id === "string" && !Number.isNaN(at.getTime())) lastSentBySlug.set(r._id, at);
  }

  /** @type {{ slug: string; ok: boolean; error?: string }[]} */
  const results = [];

  for (let i = 0; i < list.length; i += 1) {
    const row = /** @type {Record<string, unknown>} */ (list[i]);
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;

    if (npsClientAgeStatus(row, now).tooNew) {
      results.push({ slug, ok: true, error: SKIP_TOO_NEW });
      continue;
    }

    const lastSentAt = lastSentBySlug.get(slug);
    if (lastSentAt && lastSentAt >= dayStart) {
      results.push({ slug, ok: true, error: SKIP_SENT_TODAY });
      continue;
    }
    if (lastSentAt && lastSentAt > addCalendarMonths(now, -npsCadenceMonths(row.npsInterval))) {
      results.push({ slug, ok: true, error: SKIP_WITHIN_CYCLE });
      continue;
    }

    const sendResult = await sendNpsEmailToClient({
      clientSlug: slug,
      includeTest,
    });

    if (sendResult.error) {
      results.push({ slug, ok: false, error: sendResult.error });
    } else {
      results.push({ slug, ok: true });
    }
  }

  const sent = results.filter((r) => r.ok && !r.error).length;
  const failed = results.filter((r) => !r.ok).length;
  const skipped = results.filter((r) => r.ok && r.error).length;

  return { sent, failed, skipped, total: list.length, results };
}
