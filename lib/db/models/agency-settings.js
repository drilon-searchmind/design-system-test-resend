import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/** Singleton pr. scope med justerbare nøgletal-parametre (se lib/crm/agency-settings.js). */
const agencySettingsSchema = new Schema(
  {
    scopeKey: { type: String, required: true, unique: true, default: "default" },
    profitabilityPerEmployee: { type: Number },
    weightIndeks: { type: Number },
    weightNps: { type: Number },
    weightTime: { type: Number },
    indeksSensitivity: { type: Number },
    overBudgetPenalty: { type: Number },
    topClientsCount: { type: Number },
    healthyThreshold: { type: Number },
    warnThreshold: { type: Number },
    ...isTestField,
  },
  { timestamps: true },
);

const AgencySettings =
  mongoose.models.AgencySettings ?? mongoose.model("AgencySettings", agencySettingsSchema);

export default AgencySettings;
