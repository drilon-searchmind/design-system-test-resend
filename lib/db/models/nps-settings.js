import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const sendDateSchema = new Schema(
  {
    /** 1–12 */
    month: { type: Number, required: true, min: 1, max: 12 },
    /** 1–31 */
    day: { type: Number, required: true, min: 1, max: 31 },
  },
  { _id: false },
);

const npsSettingsSchema = new Schema(
  {
    /** Singleton key per scope (production / test) */
    scopeKey: { type: String, required: true, unique: true, default: "default" },
    /** Automatisk udsendelse via cron på planlagte datoer */
    autoSendEnabled: { type: Boolean, default: false },
    /** Lokal sendetid (HH:mm, Europe/Copenhagen) */
    sendTimeLocal: { type: String, default: "09:00" },
    /** Tilbagevendende årlige udsendelsesdatoer */
    sendDates: { type: [sendDateSchema], default: [] },
    ...isTestField,
  },
  { timestamps: true },
);

const NpsSettings =
  mongoose.models.NpsSettings ?? mongoose.model("NpsSettings", npsSettingsSchema);

export default NpsSettings;
