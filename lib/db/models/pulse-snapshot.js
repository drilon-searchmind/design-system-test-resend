import mongoose from "mongoose";

const { Schema } = mongoose;

/** Månedligt øjebliksbillede af nøgletal — bruges til rigtige "forrige måned"-sammenligninger. */
const pulseSnapshotSchema = new Schema(
  {
    ym: { type: String, required: true },
    scope: { type: String, enum: ["production", "all"], default: "production" },
    mrr: { type: Number, default: 0 },
    upsellMrr: { type: Number, default: 0 },
    avgMargin: { type: Number },
    activeClients: { type: Number, default: 0 },
  },
  { timestamps: true },
);
pulseSnapshotSchema.index({ ym: 1, scope: 1 }, { unique: true });

const PulseSnapshot = mongoose.models.PulseSnapshot ?? mongoose.model("PulseSnapshot", pulseSnapshotSchema);

export default PulseSnapshot;