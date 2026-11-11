import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/**
 * Valgfrie metadata for en kundegruppe (hovedkunde). Selve grupperingen er afledt af
 * `Client.cvr` — to eller flere klienter med samme (normaliserede) CVR er én kundegruppe.
 * Her gemmes kun det der ikke kan udledes: et pænt navn og fælles kundeinfo.
 */
const clientGroupSchema = new Schema(
  {
    /** Normaliseret CVR (8 cifre) — kundegruppens nøgle. */
    cvr: { type: String, required: true, unique: true, trim: true, index: true },
    /** Hovedkundens navn, fx "FB Trading". */
    name: { type: String, required: true, trim: true },
    /** Rich HTML kundeinfo for hele kundegruppen (samme format som Client.infoMd). */
    infoMd: { type: String },
    ...isTestField,
  },
  { timestamps: true },
);

const ClientGroup =
  mongoose.models.ClientGroup ?? mongoose.model("ClientGroup", clientGroupSchema);

export default ClientGroup;
