import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const contactEmbed = new Schema(
  {
    name: { type: String },
    title: { type: String },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    lastContactedAt: { type: Date },
    linkedinUrl: { type: String },
    isPrimary: { type: Boolean },
  },
  { _id: false },
);

const clientSchema = new Schema(
  {
    /** Public slug / legacy id, e.g. c-nordvig */
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, index: true },
    industry: { type: String },
    logoInitials: { type: String, maxlength: 4 },
    hue: { type: Number },
    currency: { type: String, default: "DKK" },
    /** Apex YoY Indeks (synkroniseret fra Apex /api/crm/indeks). Tom = ikke hentet endnu. */
    apexIndeks: {
      type: new Schema(
        {
          indeks: { type: Number, default: null },
          status: { type: String, trim: true },
          businessCategory: { type: String, trim: true },
          headlineMetric: { type: String, trim: true },
          aggregation: { type: String, trim: true },
          partial: { type: Boolean },
          customerCount: { type: Number },
          computedAt: { type: Date },
          fetchedAt: { type: Date },
          window: { type: Schema.Types.Mixed },
          perChannel: { type: Schema.Types.Mixed },
          members: { type: Schema.Types.Mixed },
        },
        { _id: false },
      ),
      default: undefined,
    },
    /** MRR retainer (fast månedlig) — kontrakter lægges oveni, se retainer-utils */
    retainerAmount: { type: Number },
    /** Engangssalg: web (kr) */
    oneOffWebAmount: { type: Number },
    /** Serviceaftale (kr pr. år) */
    serviceAgreementAnnual: { type: Number },
    /** Department key → budget (kr/md) udtaget af den samlede MRR */
    serviceBudgets: { type: Map, of: Number, default: undefined },
    /** Log over ændringer i aftalebeløb (opsalg m.m.) */
    commercialLog: {
      type: [
        new Schema(
          {
            at: { type: Date, default: Date.now },
            by: { type: String },
            note: { type: String },
            changes: { type: Schema.Types.Mixed },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    startedAt: { type: Date },
    renewalAt: { type: Date },
    status: {
      type: String,
      enum: ["active", "paused", "inactive"],
      default: "active",
      index: true,
    },
    health: {
      type: String,
      enum: ["ok", "warn", "bad"],
      default: "ok",
      index: true,
    },
    ownerMemberKey: { type: String, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "TeamMember", index: true },
    /** Department key → percentage (0–100), see mock `allocation` */
    allocation: { type: Map, of: Number, default: undefined },
    servicesActive: [{ type: String }],
    tags: [{ type: String }],
    primaryContact: contactEmbed,
    secondaryContact: contactEmbed,
    hoursThisMonth: { type: Number },
    hoursBudget: { type: Number },
    monthlyProfitMargin: { type: Number },
    utilisationHistory: [{ type: Number }],
    npsInterval: {
      type: String,
      enum: ["monthly", "quarterly", "biannual"],
    },
    npsTemplateId: { type: Schema.Types.ObjectId, ref: "NpsTemplate", index: true },
    /** When false, manual/automated NPS sends are blocked for this client */
    npsSendEnabled: { type: Boolean, default: true, index: true },
    npsRecipientKind: {
      type: String,
      enum: ["primary", "secondary", "contact", "custom"],
      default: "primary",
    },
    npsRecipientContactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    npsRecipientCustom: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    /** Denormalised for list views */
    lastActivityLabel: { type: String },
    cvr: { type: String },
    /**
     * Manuel kundegruppe-nøgle (`g-navn-xxxx`) til brands med forskellige CVR'er.
     * Tom = kundegruppe afledt af CVR. "-" = bevidst selvstændig.
     */
    groupKey: { type: String, trim: true, index: true },
    terminatedAt: { type: Date },
    churnReason: [{ type: String }],
    churnNote: { type: String },
    leadSource: { type: String },
    googleDriveUrl: { type: String },
    annualAdjustmentPct: { type: Number },
    lastContactedAt: { type: Date },
    deptAssignees: { type: Map, of: String, default: undefined },
    /** ClickUp Account Dashboard task id (e.g. 869dvuqnz) */
    customerClickUpId: { type: String, unique: true, sparse: true, trim: true, index: true },
    /** ClickUp task title — often primary domain (e.g. snck.dk) */
    clickUpTaskName: { type: String, trim: true },
    marketingStartMrr: { type: Number },
    marketingUpsellMrr: { type: Number },
    /** ClickUp 🤝 Aftale type (e.g. Løbende, Projekt) */
    agreementType: { type: String, trim: true },
    /** Rich HTML kundeinfo (same format as KB bodyMd). */
    infoMd: { type: String },
    ...isTestField,
  },
  { timestamps: true },
);

clientSchema.index({ name: "text", industry: "text", tags: "text" });

// HMR: genkompilér hvis den cachede model mangler de nyeste felter.
if (
  mongoose.models.Client &&
  (!mongoose.models.Client.schema.path("oneOffWebAmount") ||
    !mongoose.models.Client.schema.path("apexIndeks"))
) {
  delete mongoose.models.Client;
  if (mongoose.connection?.models?.Client) delete mongoose.connection.models.Client;
}

const Client = mongoose.models.Client ?? mongoose.model("Client", clientSchema);

export default Client;
