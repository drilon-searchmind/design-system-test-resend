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
    retainerAmount: { type: Number },
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
    /** Denormalised for list views */
    lastActivityLabel: { type: String },
    cvr: { type: String },
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
    ...isTestField,
  },
  { timestamps: true },
);

clientSchema.index({ name: "text", industry: "text", tags: "text" });

const Client = mongoose.models.Client ?? mongoose.model("Client", clientSchema);

export default Client;
