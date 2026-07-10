import Client from "@/lib/db/models/client";
import NpsSendLog from "@/lib/db/models/nps-send-log";
import { connectDb } from "@/lib/db/mongoose";
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

/**
 * Automatisk NPS-udsendelse på planlagte datoer (cron).
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
    .select({ slug: 1 })
    .lean();

  const list = Array.isArray(clients) ? clients : [];
  /** @type {{ slug: string; ok: boolean; error?: string }[]} */
  const results = [];

  for (let i = 0; i < list.length; i += 1) {
    const row = /** @type {Record<string, unknown>} */ (list[i]);
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;

    const alreadySent = await NpsSendLog.findOne(
      /** @type {Record<string, unknown>} */ (
        andQuery(scope, {
          clientSlug: slug,
          status: "sent",
          sentAt: { $gte: dayStart },
        })
      ),
    ).lean();

    if (alreadySent) {
      results.push({ slug, ok: true, error: "already_sent_today" });
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

  const sent = results.filter((r) => r.ok && r.error !== "already_sent_today").length;
  const failed = results.filter((r) => !r.ok).length;
  const skipped = results.filter((r) => r.error === "already_sent_today").length;

  return { sent, failed, skipped, total: list.length, results };
}
