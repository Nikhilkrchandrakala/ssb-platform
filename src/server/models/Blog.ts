import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true },
    content: { type: String, required: true },
    images: [
      {
        imageUrl: { type: String, required: true },
        imageText: { type: String, default: "" },
      },
    ],
    timeDuration: { type: String, default: "" },
    authorName: { type: String, required: true },
    authorQuote: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
