import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/** Opsalg på en eksisterende kunde (engangs, tillæg i periode eller fast MRR-stigning). */
const upsellSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientSlug: { type: String, trim: true },
    type: { type: String, enum: ["one_time", "temporary_mrr", "mrr_increase"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "DKK" },
    /** "YYYY-MM" — første måned aftalen gælder for */
    periodFrom: { type: String, required: true, index: true },
    /** "YYYY-MM" — sidste måned (= periodFrom for engangs og fast MRR-stigning) */
    periodTo: { type: String, required: true },
    soldBy: { type: String, required: true, trim: true },
    soldByKey: { type: String, trim: true },
    soldAt: { type: Date, required: true },
    /** Afdeling opsalget regnes til i rentabilitet (valgfri) */
    department: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    createdBy: { type: String, trim: true },
    ...isTestField,
  },
  { timestamps: true },
);

const Upsell = mongoose.models.Upsell ?? mongoose.model("Upsell", upsellSchema);

export default Upsell;