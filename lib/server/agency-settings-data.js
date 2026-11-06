import { DEFAULT_AGENCY_SETTINGS, normalizeAgencySettings, validateAgencySettings } from "@/lib/crm/agency-settings";
import AgencySettings from "@/lib/db/models/agency-settings";
import { connectDb } from "@/lib/db/mongoose";

/**
 * Hent justerbare nøgletal-parametre (standardværdier hvis intet er gemt).
 * Workspace-niveau: ét dokument, uafhængigt af test-scope.
 */
export async function fetchAgencySettings() {
  await connectDb();
  const doc = await AgencySettings.findOne({ scopeKey: "default" }).lean();
  if (!doc) return { ...DEFAULT_AGENCY_SETTINGS };
  return normalizeAgencySettings(doc);
}

/**
 * Gem (delvis) opdatering. Manglende felter beholdes fra de nuværende værdier.
 * @param {unknown} patch
 */
export async function patchAgencySettings(patch) {
  const current = await fetchAgencySettings();
  const body = patch && typeof patch === "object" ? /** @type {Record<string, unknown>} */ (patch) : {};
  const res = validateAgencySettings({ ...current, ...body });
  if ("error" in res) return { error: res.error, status: 400 };

  await AgencySettings.findOneAndUpdate(
    { scopeKey: "default" },
    { $set: res.settings, $setOnInsert: { scopeKey: "default" } },
    { upsert: true, returnDocument: "after" },
  );
  return { settings: res.settings };
}

/** Nulstil til standardværdier. */
export async function resetAgencySettings() {
  await connectDb();
  await AgencySettings.deleteOne({ scopeKey: "default" });
  return { settings: { ...DEFAULT_AGENCY_SETTINGS } };
}
