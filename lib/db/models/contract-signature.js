import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/**
 * Simple Electronic Signature (SES) evidence under eIDAS —
 * suitable for standard agency retainer/service agreements.
 */
const contractSignatureSchema = new Schema(
  {
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true, index: true },
    inviteId: { type: Schema.Types.ObjectId, ref: "ContractSigningInvite", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    signerName: { type: String, required: true, trim: true },
    signerEmail: { type: String, required: true, lowercase: true, trim: true },
    signerTitle: { type: String, trim: true },
    signerCompany: { type: String, trim: true },
    signedAt: { type: Date, required: true, default: Date.now, index: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    /** Exact consent wording accepted by the signer */
    consentText: { type: String, required: true },
    consentAccepted: { type: Boolean, required: true, default: true },
    /** SHA-256 of documentBodyMd at time of signing */
    documentHash: { type: String, required: true },
    documentBodyMd: { type: String, required: true },
    contractVersion: { type: Number, default: 1 },
    ...isTestField,
  },
  { timestamps: true },
);

contractSignatureSchema.index({ contractId: 1, signedAt: -1 });

const ContractSignature =
  mongoose.models.ContractSignature ?? mongoose.model("ContractSignature", contractSignatureSchema);

export default ContractSignature;
