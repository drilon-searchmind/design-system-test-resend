import mongoose from "mongoose";

const { Schema } = mongoose;

const clientDomainSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    clientSlug: { type: String, index: true },
    /** Static demo id fx dom-nv-1 */
    staticId: { type: String, trim: true, index: true },
    domain: { type: String, required: true, trim: true },
    locale: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    cms: { type: String },
  },
  { timestamps: true },
);

clientDomainSchema.index({ clientId: 1, domain: 1 }, { unique: true });

const ClientDomain =
  mongoose.models.ClientDomain ?? mongoose.model("ClientDomain", clientDomainSchema);

export default ClientDomain;
