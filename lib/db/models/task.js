import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    clientSlug: { type: String, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true },
    hint: { type: String },
    departmentKey: { type: String, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    assigneeMemberKey: { type: String, index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "TeamMember", index: true },
    status: {
      type: String,
      enum: ["todo", "doing", "review", "done", "blocked", "cancelled"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
      index: true,
    },
    dueDate: { type: Date },
    estimateHours: { type: Number },
    loggedHours: { type: Number, default: 0 },
    templateId: { type: Schema.Types.ObjectId, ref: "TaskTemplate" },
    ...isTestField,
  },
  { timestamps: true },
);

taskSchema.index({ clientId: 1, status: 1, dueDate: 1 });
taskSchema.index({ assigneeId: 1, status: 1 });

const Task = mongoose.models.Task ?? mongoose.model("Task", taskSchema);

export default Task;
