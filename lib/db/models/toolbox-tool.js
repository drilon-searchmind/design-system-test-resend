import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Interne værktøjer i Toolbox (vedligeholdes af admins).
 * Konfiguration der deles af produktions- og testdata (intet `isTest`).
 */
const toolboxToolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    adminOnly: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ToolboxTool = mongoose.models.ToolboxTool ?? mongoose.model("ToolboxTool", toolboxToolSchema);

export default ToolboxTool;
