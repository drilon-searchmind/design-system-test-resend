import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["task_assigned", "task_mention", "contract_signed"],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    href: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", index: true },
    commentId: { type: Schema.Types.ObjectId, ref: "TaskComment" },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    actorMemberKey: { type: String },
    actorDisplayName: { type: String, default: "" },
    contextTitle: { type: String, default: "" },
    /** TeamMember.key for the recipient — used when fetching for logged-in user */
    recipientMemberKey: { type: String, index: true },
    readAt: { type: Date, default: null, index: true },
    ...isTestField,
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientMemberKey: 1, readAt: 1, createdAt: -1 });

// Dev/HMR: recompile if the cached model predates the `contract_signed` type.
if (mongoose.models.Notification) {
  const values = mongoose.models.Notification.schema.path("type")?.enumValues ?? [];
  if (!values.includes("contract_signed")) {
    delete mongoose.models.Notification;
    if (mongoose.connection?.models?.Notification) delete mongoose.connection.models.Notification;
  }
}

const Notification =
  mongoose.models.Notification ?? mongoose.model("Notification", notificationSchema);

export default Notification;
