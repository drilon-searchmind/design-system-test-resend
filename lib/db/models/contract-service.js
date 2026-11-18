import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Servicelinjer der kan vælges når en kontrakt sendes (vedligeholdes af admins).
 * Kataloget er konfiguration og deles af produktions- og testdata (intet `isTest`).
 */
const contractServiceSchema = new Schema(
  {
    /** Stabil nøgle der gemmes på kontraktlinjen (fx seo, oneoff-web) */
    key: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    /** Department.key — løbende linjer lægges i kundens `serviceBudgets.<afdeling>` */
    departmentKey: { type: String, trim: true },
    billing: {
      type: String,
      enum: ["monthly", "one_off", "annual"],
      default: "monthly",
    },
    defaultAmount: { type: Number, min: 0 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ContractService =
  mongoose.models.ContractService ?? mongoose.model("ContractService", contractServiceSchema);

export default ContractService;
