import mongoose from "mongoose";

import { ACCESS_TIERS } from "@/lib/constants/access-tiers";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String },
    image: { type: String },
    googleSubject: { type: String, sparse: true, unique: true },
    emailVerifiedAt: { type: Date },
    accessTier: {
      type: String,
      enum: Object.values(ACCESS_TIERS),
      required: true,
      default: ACCESS_TIERS.INTERNAL_FULL,
      index: true,
    },
    provisionedVia: {
      type: String,
      enum: ["workspace_google_sso", "invite", "admin_seed", "migration"],
      default: "workspace_google_sso",
    },
    /** ClickUp workspace member id (list members API) */
    clickUpMemberId: { type: String, unique: true, sparse: true, trim: true, index: true },
    /** Room for future RBAC / integrations without another migration */
    caps: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

export default User;
