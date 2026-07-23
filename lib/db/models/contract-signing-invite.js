import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contractSigningInviteSchema = new Schema(
  {
    /** Unguessable URL token (base64url) */
    token: { type: String, required: true, unique: true, trim: true, index: true },
    /** SHA-256 hex af adgangskode (sendes i e-mail) */
    accessCodeHash: { type: String, required: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientSlug: { type: String, required: true, trim: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "ContractTemplate" },
    signerEmail: { type: String, required: true, lowercase: true, trim: true },
    signerName: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "unlocked", "signed", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    sentAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    unlockedAt: { type: Date },
    signedAt: { type: Date, index: true },
    signatureId: { type: Schema.Types.ObjectId, ref: "ContractSignature", index: true },
    postmarkMessageId: { type: String },
    /** Snapshot af dokument ved udsendelse */
    documentBodyMd: { type: String, required: true },
    documentHash: { type: String, required: true },
    ...isTestField,
  },
  { timestamps: true },
);

contractSigningInviteSchema.index({ contractId: 1, sentAt: -1 });

const ContractSigningInvite =
  mongoose.models.ContractSigningInvite ??
  mongoose.model("ContractSigningInvite", contractSigningInviteSchema);

export default ContractSigningInvite;
