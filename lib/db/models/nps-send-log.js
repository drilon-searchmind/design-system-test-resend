import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const npsSendLogSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    clientSlug: { type: String, trim: true, index: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactName: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: "NpsTemplate", index: true },
    templateKey: { type: String, trim: true },
    subject: { type: String },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
      index: true,
    },
    postmarkMessageId: { type: String },
    postmarkError: { type: String },
    sentAt: { type: Date, default: Date.now, index: true },
    sentByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    bodyPreview: { type: String },
    ...isTestField,
  },
  { timestamps: true },
);

npsSendLogSchema.index({ clientId: 1, sentAt: -1 });
npsSendLogSchema.index({ status: 1, sentAt: -1 });

const NpsSendLog = mongoose.models.NpsSendLog ?? mongoose.model("NpsSendLog", npsSendLogSchema);

export default NpsSendLog;
