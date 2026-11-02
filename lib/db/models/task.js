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
    /** Tidspunkt opgaven blev afsluttet (ClickUp date_done). */
    completedAt: { type: Date },
    /** Kundens CVR på importtidspunktet (kunde kobles via mappe → klient → CVR). */
    clientCvr: { type: String, trim: true, index: true },
    /** ClickUp-import: opgave-id (unik) — bruges til at opdatere frem for at oprette dubletter. */
    clickUpTaskId: { type: String, unique: true, sparse: true, trim: true, index: true },
    clickUpUrl: { type: String, trim: true },
    /** Original ClickUp-status (fx "client review") — Agency OS-status ligger i `status`. */
    clickUpStatus: { type: String, trim: true },
    clickUpListName: { type: String, trim: true },
    clickUpServiceLine: { type: String, trim: true },
    clickUpFolderName: { type: String, trim: true },
    clickUpTags: { type: [String], default: undefined },
    clickUpCreatedAt: { type: Date },
    clickUpImportedAt: { type: Date },
    ...isTestField,
  },
  { timestamps: true },
);

taskSchema.index({ clientId: 1, status: 1, dueDate: 1 });
taskSchema.index({ assigneeId: 1, status: 1 });
taskSchema.index({ parentTaskId: 1, status: 1 });

const Task = mongoose.models.Task ?? mongoose.model("Task", taskSchema);

export default Task;
