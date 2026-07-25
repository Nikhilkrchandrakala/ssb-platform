import mongoose, { Schema } from "mongoose";

const gallerySchema = new Schema(
  {
    title: { type: String, required: true },
    images: [{ imageUrl: String, imageText: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Gallery = mongoose.models.Gallery || mongoose.model("Gallery", gallerySchema);
