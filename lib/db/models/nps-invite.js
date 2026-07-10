import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const npsInviteSchema = new Schema(
  {
    /** Unguessable URL token (base64url) */
    token: { type: String, required: true, unique: true, trim: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientSlug: { type: String, required: true, trim: true, index: true },
    sendLogId: { type: Schema.Types.ObjectId, ref: "NpsSendLog", index: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactName: { type: String, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: "NpsTemplate" },
    sentAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date, index: true },
    responseId: { type: Schema.Types.ObjectId, ref: "NpsResponse", index: true },
    ...isTestField,
  },
  { timestamps: true },
);

npsInviteSchema.index({ clientId: 1, sentAt: -1 });

const NpsInvite = mongoose.models.NpsInvite ?? mongoose.model("NpsInvite", npsInviteSchema);

export default NpsInvite;
