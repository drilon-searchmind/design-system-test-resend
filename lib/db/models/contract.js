import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contractSchema = new Schema(
  {
    /** Stabil id i UI (fx ctr-c-nordvig) — valgfri indtil migrering */
    key: { type: String, unique: true, sparse: true, trim: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientSlug: { type: String, index: true },
    type: {
      type: String,
      enum: ["retainer", "project", "one_off", "subscription"],
      default: "retainer",
      index: true,
    },
    label: { type: String },
    value: { type: Number },
    currency: { type: String, default: "DKK" },
    startDate: { type: Date },
    endDate: { type: Date },
    renewalDate: { type: Date },
    status: {
      type: String,
      enum: ["draft", "active", "notice", "ended"],
      default: "active",
      index: true,
    },
    termsSummary: { type: String },
    noticeDays: { type: Number },
    documentUrl: { type: String },
    signedBy: { type: String },
    ...isTestField,
  },
  { timestamps: true },
);

contractSchema.index({ clientId: 1, status: 1 });

const Contract = mongoose.models.Contract ?? mongoose.model("Contract", contractSchema);

export default Contract;
