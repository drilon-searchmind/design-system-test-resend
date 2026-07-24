import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    clientSlug: { type: String, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true },
    hint: { type: String },
    /** Rich HTML beskrivelse (saniteret ved gem). */
    description: { type: String, default: "" },
    departmentKey: { type: String, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    assigneeMemberKey: { type: String, index: true },
    assigneeMemberKeys: { type: [String], default: [], index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "TeamMember", index: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    createdByMemberKey: { type: String, index: true },
    createdByMemberId: { type: Schema.Types.ObjectId, ref: "TeamMember" },
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
    /** Planlagt start/slut i Min kalender (legacy — brug calendarSlots). */
    scheduledStart: { type: Date, index: true },
    scheduledEnd: { type: Date, index: true },
    /** Flere kalenderblokke per opgave (multi-dag planlægning). */
    calendarSlots: [
      {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        /** Ejer af kalenderblokken (Min kalender er per bruger). */
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
      },
    ],
    /** false = intern tid; default true (fakturerbar). */
    billable: { type: Boolean, default: true, index: true },
    estimateHours: { type: Number },
    loggedHours: { type: Number, default: 0 },
    templateId: { type: Schema.Types.ObjectId, ref: "TaskTemplate" },
    /** Delopgave under en hovedopgave — arver kunde og prioritet fra parent. */
    isSubTask: { type: Boolean, default: false, index: true },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", index: true, sparse: true },
    ...isTestField,
  },
  { timestamps: true },
);

taskSchema.index({ clientId: 1, status: 1, dueDate: 1 });
taskSchema.index({ assigneeId: 1, status: 1 });
taskSchema.index({ parentTaskId: 1, status: 1 });

const Task = mongoose.models.Task ?? mongoose.model("Task", taskSchema);

export default Task;
