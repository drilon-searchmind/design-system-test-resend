import mongoose from "mongoose";

const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    key: { type: String, unique: true, sparse: true, trim: true },
    clientSlug: { type: String, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    authorMemberKey: { type: String },
    authorId: { type: Schema.Types.ObjectId, ref: "TeamMember" },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    /** Visningsnavn ved oprettelse (fallback hvis brugeren ikke er koblet til et teammedlem). */
    authorName: { type: String, trim: true },
    type: {
      type: String,
      enum: ["note", "call", "meeting", "alert"],
      default: "note",
    },
    /**
     * Hvor noten kommer fra. Tom på ældre noter (seed-scripts) — se `noteSourceLabel`.
     * manual = oprettet i CRM, clickup = importeret, seed = demo-/testdata.
     */
    source: { type: String, enum: ["manual", "clickup", "seed"] },
    body: { type: String, required: true },
    taskKey: { type: String, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    /** Original timeline string or parsed instant */
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

noteSchema.index({ clientId: 1, occurredAt: -1 });

// HMR: genkompilér hvis den cachede model mangler de nyeste felter.
if (mongoose.models.Note && !mongoose.models.Note.schema.path("source")) {
  delete mongoose.models.Note;
  if (mongoose.connection?.models?.Note) delete mongoose.connection.models.Note;
}

const Note = mongoose.models.Note ?? mongoose.model("Note", noteSchema);

export default Note;
