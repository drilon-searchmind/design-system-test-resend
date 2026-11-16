import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/**
 * Tone of Voice pr. kunde (præcis én pr. kunde). `profile` følger lib/tov/schema.js og er
 * ens for alle kunder; `preview` er den gemte HTML-eksempelside.
 */
const tovProfileSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, unique: true, index: true },
    clientSlug: { type: String, trim: true, index: true },
    status: { type: String, enum: ["empty", "analyzing", "ready", "error"], default: "empty" },
    error: { type: String, default: "" },
    /** Fri kommentar fra brugeren, sendes med til modellen */
    comment: { type: String, default: "" },
    model: { type: String, default: "claude-sonnet-5-5" },
    schemaVersion: { type: Number, default: 1 },
    profile: { type: Schema.Types.Mixed, default: null },
    analyzedAt: { type: Date },
    analyzedBy: { type: String, trim: true },
    analyzedModel: { type: String, trim: true },
    usage: { input: Number, output: Number },
    /** Gemt eksempel-HTML (genereres kun on demand) */
    preview: {
      html: { type: String, default: "" },
      title: { type: String, default: "" },
      model: { type: String, default: "" },
      generatedAt: { type: Date },
    },
    /** Tidligere versioner (nyeste først, max 10) så man kan gendanne */
    history: [
      {
        profile: { type: Schema.Types.Mixed },
        analyzedAt: { type: Date },
        analyzedBy: { type: String },
        model: { type: String },
        note: { type: String },
      },
    ],
    ...isTestField,
  },
  { timestamps: true },
);

const TovProfile = mongoose.models.TovProfile ?? mongoose.model("TovProfile", tovProfileSchema);

export default TovProfile;
