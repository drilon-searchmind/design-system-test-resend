import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const npsTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    bodyMd: { type: String, required: true },
    locale: { type: String, default: "da" },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false, index: true },
    ...isTestField,
  },
  { timestamps: true },
);

const NpsTemplate =
  mongoose.models.NpsTemplate ?? mongoose.model("NpsTemplate", npsTemplateSchema);

export default NpsTemplate;
