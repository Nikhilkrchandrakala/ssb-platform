import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    price: Number,
    thumbnail: { type: String },
    courseId: { type: String, unique: true, sparse: true },
    images: [{ imageUrl: String }],
    duration: String,
    category: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Course = mongoose.models.SSBCourses || mongoose.model("SSBCourses", courseSchema);
