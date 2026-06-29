import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    name: { type: String, required: true },
    title: { type: String },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String },
    isPrimary: { type: Boolean, default: false },
    lastContactedAt: { type: Date },
    linkedinUrl: { type: String },
    ...isTestField,
  },
  { timestamps: true },
);

contactSchema.index({ clientId: 1, email: 1 });

const Contact = mongoose.models.Contact ?? mongoose.model("Contact", contactSchema);

export default Contact;
