import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contractTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    /** E-mail emne — understøtter {{clientName}}, {{contractLabel}} */
    subject: { type: String, required: true },
    /** E-mail brødtekst — brug {{signingUrl}}, {{accessCode}}, {{clientName}} */
    emailBodyMd: { type: String, required: true },
    /** Kontrakttekst der vises og underskrives */
    documentBodyMd: { type: String, required: true },
    defaultType: {
      type: String,
      enum: ["retainer", "project", "one_off", "subscription"],
      default: "retainer",
    },
    defaultNoticeDays: { type: Number, default: 90 },
    locale: { type: String, default: "da" },
    active: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    ...isTestField,
  },
  { timestamps: true },
);

const ContractTemplate =
  mongoose.models.ContractTemplate ?? mongoose.model("ContractTemplate", contractTemplateSchema);

export default ContractTemplate;
