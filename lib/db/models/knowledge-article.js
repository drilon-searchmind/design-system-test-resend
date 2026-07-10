import mongoose from "mongoose";

import { isTestField } from "@/lib/db/schema/test-data-flag";

const { Schema } = mongoose;

const knowledgeArticleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true },
    summary: { type: String },
    bodyMd: { type: String },
    /** Wiki section id — see KNOWLEDGE_SECTIONS */
    sectionId: { type: String, required: true, index: true },
    /** Parent article slug for nested wiki pages */
    parentSlug: { type: String, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    icon: { type: String },
    headerImageUrl: { type: String },
    tags: [{ type: String }],
    audience: {
      type: String,
      enum: ["internal", "client", "public"],
      default: "internal",
      index: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "TeamMember", index: true },
    authorMemberKey: { type: String, index: true },
    readingMinutes: { type: Number },
    featured: { type: Boolean, default: false, index: true },
    published: { type: Boolean, default: true, index: true },
    archived: { type: Boolean, default: false, index: true },
    ...isTestField,
  },
  { timestamps: true },
);

knowledgeArticleSchema.index({ title: "text", summary: "text", tags: "text" });
knowledgeArticleSchema.index({ sectionId: 1, sortOrder: 1 });

const KnowledgeArticle =
  mongoose.models.KnowledgeArticle ??
  mongoose.model("KnowledgeArticle", knowledgeArticleSchema);

export default KnowledgeArticle;
