import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

/** Skabelon til at oprette standardiserede opgaver — matcher Task templates i UI. */
const taskTemplateSchema = new Schema(
  {
    /** Stabil nøgle fx `tpl-seo-audit` */
    key: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    departmentKey: { type: String, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    defaultPriority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    suggestedHours: { type: Number },
    /** Standard forfalds-offset når opgave provisioneres (kalenderdage). */
    defaultDueOffsetDays: { type: Number },
    /** Aftale-scope hint til UI (provisionering). */
    scope: {
      type: String,
      enum: ["retainer", "project", "any"],
      default: "retainer",
      index: true,
    },
    /** Standard ansvarlige ved provisionering (member keys). */
    assigneeMemberKeys: { type: [String], default: [], index: true },
    /** false = intern tid; default true (fakturerbar). */
    billable: { type: Boolean, default: true, index: true },
    checklist: [{ type: String }],
    active: { type: Boolean, default: true, index: true },
    ...isTestField,
  },
  { timestamps: true },
);

const TaskTemplate =
  mongoose.models.TaskTemplate ?? mongoose.model("TaskTemplate", taskTemplateSchema);

export default TaskTemplate;
