import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/**
 * Materiale til en kundes Brand Core. Tekst/URL gemmes som udtrukket tekst;
 * PDF og billeder gemmes som binær i MongoDB (så analysen kan køres igen).
 */
const tovSourceSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    kind: { type: String, enum: ["file", "url", "text"], required: true },
    /** "pdf" | "image" | "text" | "html" */
    mediaType: { type: String, enum: ["pdf", "image", "text", "html"], required: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 },
    url: { type: String, trim: true },
    /** Udtrukket tekst (tekstfiler, mails, URL-indhold) */
    text: { type: String, default: "" },
    /** Designhints fra URL'er (fonte, farver) */
    hints: { type: String, default: "" },
    /** Legacy inline binary (small files). Prefer `gridFsId` for PDFs/images. */
    data: { type: Buffer },
    /** GridFS file id in bucket `tov_source_files` (for files that would exceed BSON 16 MB). */
    gridFsId: { type: Schema.Types.ObjectId, default: null, index: true },
    createdBy: { type: String, trim: true },
    ...isTestField,
  },
  { timestamps: true },
);

const TovSource = mongoose.models.TovSource ?? mongoose.model("TovSource", tovSourceSchema);

export default TovSource;
