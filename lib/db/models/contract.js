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
      enum: ["draft", "pending_signature", "active", "paused", "notice", "ended"],
      default: "draft",
      index: true,
    },
    termsSummary: { type: String },
    /** Fulde kontrakttekst (markdown) — snapshot ved send/sign */
    documentBodyMd: { type: String },
    noticeDays: { type: Number },
    documentUrl: { type: String },
    /** Legacy display string — prefer signedByName */
    signedBy: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: "ContractTemplate", index: true },
    version: { type: Number, default: 1 },
    previousContractId: { type: Schema.Types.ObjectId, ref: "Contract", index: true },
    /** Seneste signatur-evidence (denormaliseret til hurtig UI) */
    signedAt: { type: Date, index: true },
    signedByName: { type: String, trim: true },
    signedByEmail: { type: String, lowercase: true, trim: true },
    signedByTitle: { type: String, trim: true },
    signedByCompany: { type: String, trim: true },
    signatureIp: { type: String, trim: true },
    signatureUserAgent: { type: String, trim: true },
    signatureDocumentHash: { type: String, trim: true },
    signatureId: { type: Schema.Types.ObjectId, ref: "ContractSignature", index: true },
    consentAcceptedAt: { type: Date },
    ...isTestField,
  },
  { timestamps: true },
);

contractSchema.index({ clientId: 1, status: 1 });

const CONTRACT_STATUS_ENUM = [
  "draft",
  "pending_signature",
  "active",
  "paused",
  "notice",
  "ended",
];

/**
 * HMR / warm Node processes keep the first compiled schema. If an older
 * Contract model lacks `pending_signature`, drop it so we recompile.
 */
if (mongoose.models.Contract) {
  const path = mongoose.models.Contract.schema.path("status");
  const values = path?.enumValues ?? path?.options?.enum ?? [];
  const hasPending = Array.isArray(values) && values.includes("pending_signature");
  if (!hasPending) {
    delete mongoose.models.Contract;
    if (mongoose.connection?.models?.Contract) {
      delete mongoose.connection.models.Contract;
    }
  }
}

const Contract = mongoose.models.Contract ?? mongoose.model("Contract", contractSchema);

// Belt-and-suspenders: keep enum values current on an already-compiled model
{
  const path = Contract.schema.path("status");
  if (path) {
    path.enumValues = [...CONTRACT_STATUS_ENUM];
    if (path.options) path.options.enum = [...CONTRACT_STATUS_ENUM];
  }
}

export default Contract;
