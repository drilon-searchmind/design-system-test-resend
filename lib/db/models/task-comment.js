import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const taskCommentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    authorMemberKey: { type: String, index: true },
    authorMemberId: { type: Schema.Types.ObjectId, ref: "TeamMember" },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, default: "" },
    mentionedMemberKeys: { type: [String], default: [] },
    ...isTestField,
  },
  { timestamps: true },
);

taskCommentSchema.index({ taskId: 1, createdAt: -1 });

const TaskComment =
  mongoose.models.TaskComment ?? mongoose.model("TaskComment", taskCommentSchema);

export default TaskComment;
