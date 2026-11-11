import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contractSchema = new Schema(
  {
    /** Stabil id i UI (fx ctr-c-nordvig) — valgfri indtil migrering */
    key: { type: String, unique: true, sparse: true, trim: true, index: true },
    /**
     * Tom for kontrakter til en ny kunde (`prospect`) — sættes når kunden underskriver og oprettes.
     */
    clientId: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    clientSlug: { type: String, index: true },
    /**
     * Ny kunde der endnu ikke findes i CRM'et. Når kontrakten underskrives oprettes kunden
     * automatisk ud fra disse felter, og `clientId` sættes.
     */
    prospect: {
      type: new Schema(
        {
          name: { type: String, trim: true },
          cvr: { type: String, trim: true },
          /** Domæne/website (fx eksempel.dk) — bruges til kundens slug og ClickUp-matchning */
          domain: { type: String, trim: true, lowercase: true },
          industry: { type: String, trim: true },
          leadSource: { type: String, trim: true },
          agreementType: { type: String, trim: true },
          ownerMemberKey: { type: String, trim: true },
          contactName: { type: String, trim: true },
          contactTitle: { type: String, trim: true },
          contactEmail: { type: String, lowercase: true, trim: true },
          contactPhone: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    /** Service lines (Department.key) aftalen dækker — kopieres til kundens `servicesActive` */
    servicesActive: [{ type: String, trim: true }],
    /**
     * Servicelinjer med beløb (key = Department.key eller "web" for engangs-web).
     * Summen er aftalens værdi. Løbende aftaler: kr/md. Engangssalg: samlet beløb.
     */
    serviceLines: {
      type: [
        new Schema(
          {
            key: { type: String, trim: true },
            name: { type: String, trim: true },
            amount: { type: Number },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    /** Sat når kunden blev oprettet automatisk ved underskrift */
    clientCreatedAt: { type: Date },
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
    /** Sat når kontraktens linjer er lagt på den eksisterende kunde (forhindrer dobbelt-anvendelse) */
    commercialAppliedAt: { type: Date },
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
  const hasProspect = Boolean(mongoose.models.Contract.schema.path("prospect"));
  const hasServiceLines = Boolean(mongoose.models.Contract.schema.path("serviceLines"));
  const hasApplied = Boolean(mongoose.models.Contract.schema.path("commercialAppliedAt"));
  if (!hasPending || !hasProspect || !hasServiceLines || !hasApplied) {
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
